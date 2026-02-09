package service

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/pkg/antigravity"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestStripSignatureSensitiveBlocksFromClaudeRequest(t *testing.T) {
	req := &antigravity.ClaudeRequest{
		Model: "claude-sonnet-4-5",
		Thinking: &antigravity.ThinkingConfig{
			Type:         "enabled",
			BudgetTokens: 1024,
		},
		Messages: []antigravity.ClaudeMessage{
			{
				Role: "assistant",
				Content: json.RawMessage(`[
					{"type":"thinking","thinking":"secret plan","signature":""},
					{"type":"tool_use","id":"t1","name":"Bash","input":{"command":"ls"}}
				]`),
			},
			{
				Role: "user",
				Content: json.RawMessage(`[
					{"type":"tool_result","tool_use_id":"t1","content":"ok","is_error":false},
					{"type":"redacted_thinking","data":"..."}
				]`),
			},
		},
	}

	changed, err := stripSignatureSensitiveBlocksFromClaudeRequest(req)
	require.NoError(t, err)
	require.True(t, changed)
	require.Nil(t, req.Thinking)

	require.Len(t, req.Messages, 2)

	var blocks0 []map[string]any
	require.NoError(t, json.Unmarshal(req.Messages[0].Content, &blocks0))
	require.Len(t, blocks0, 2)
	require.Equal(t, "text", blocks0[0]["type"])
	require.Equal(t, "secret plan", blocks0[0]["text"])
	require.Equal(t, "text", blocks0[1]["type"])

	var blocks1 []map[string]any
	require.NoError(t, json.Unmarshal(req.Messages[1].Content, &blocks1))
	require.Len(t, blocks1, 1)
	require.Equal(t, "text", blocks1[0]["type"])
	require.NotEmpty(t, blocks1[0]["text"])
}

func TestStripThinkingFromClaudeRequest_DoesNotDowngradeTools(t *testing.T) {
	req := &antigravity.ClaudeRequest{
		Model: "claude-sonnet-4-5",
		Thinking: &antigravity.ThinkingConfig{
			Type:         "enabled",
			BudgetTokens: 1024,
		},
		Messages: []antigravity.ClaudeMessage{
			{
				Role:    "assistant",
				Content: json.RawMessage(`[{"type":"thinking","thinking":"secret plan"},{"type":"tool_use","id":"t1","name":"Bash","input":{"command":"ls"}}]`),
			},
		},
	}

	changed, err := stripThinkingFromClaudeRequest(req)
	require.NoError(t, err)
	require.True(t, changed)
	require.Nil(t, req.Thinking)

	var blocks []map[string]any
	require.NoError(t, json.Unmarshal(req.Messages[0].Content, &blocks))
	require.Len(t, blocks, 2)
	require.Equal(t, "text", blocks[0]["type"])
	require.Equal(t, "secret plan", blocks[0]["text"])
	require.Equal(t, "tool_use", blocks[1]["type"])
}

func TestAntigravityMaxRetriesForModel_AfterSwitch(t *testing.T) {
	t.Setenv(antigravityMaxRetriesEnv, "4")
	t.Setenv(antigravityMaxRetriesAfterSwitchEnv, "7")
	t.Setenv(antigravityMaxRetriesAfterSwitchAlt, "")
	t.Setenv(antigravityMaxRetriesClaudeEnv, "")
	t.Setenv(antigravityMaxRetriesGeminiTextEnv, "")
	t.Setenv(antigravityMaxRetriesGeminiImageEnv, "")

	got := antigravityMaxRetriesForModel("claude-sonnet-4-5", false)
	require.Equal(t, 4, got)

	got = antigravityMaxRetriesForModel("claude-sonnet-4-5", true)
	require.Equal(t, 7, got)
}

func TestAntigravityMaxRetriesForModel_AfterSwitchFallback(t *testing.T) {
	t.Setenv(antigravityMaxRetriesEnv, "5")
	t.Setenv(antigravityMaxRetriesAfterSwitchEnv, "")
	t.Setenv(antigravityMaxRetriesAfterSwitchAlt, "")
	t.Setenv(antigravityMaxRetriesClaudeEnv, "")
	t.Setenv(antigravityMaxRetriesGeminiTextEnv, "")
	t.Setenv(antigravityMaxRetriesGeminiImageEnv, "")

	got := antigravityMaxRetriesForModel("gemini-2.5-flash", true)
	require.Equal(t, 5, got)
}

type captureUpstreamRequest struct {
	statusCode int
	body       string
	headers    http.Header

	callCount int
	lastReq   *http.Request
	lastBody  []byte
}

func (s *captureUpstreamRequest) Do(req *http.Request, proxyURL string, accountID int64, accountConcurrency int) (*http.Response, error) {
	s.callCount++
	s.lastReq = req.Clone(req.Context())
	if req.Body != nil {
		payload, _ := io.ReadAll(req.Body)
		s.lastBody = append([]byte(nil), payload...)
	}

	respHeaders := make(http.Header)
	for k, values := range s.headers {
		respHeaders[k] = append([]string(nil), values...)
	}

	return &http.Response{
		StatusCode: s.statusCode,
		Header:     respHeaders,
		Body:       io.NopCloser(strings.NewReader(s.body)),
	}, nil
}

func (s *captureUpstreamRequest) DoWithTLS(req *http.Request, proxyURL string, accountID int64, accountConcurrency int, enableTLSFingerprint bool) (*http.Response, error) {
	return s.Do(req, proxyURL, accountID, accountConcurrency)
}

func newGatewayTestContext(body string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/messages", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	return c, rec
}

func TestForward_UpstreamAccountRoutesToClaudeEndpoint(t *testing.T) {
	upstream := &captureUpstreamRequest{
		statusCode: http.StatusInternalServerError,
		body:       `{"error":{"message":"boom"}}`,
	}
	svc := &AntigravityGatewayService{httpUpstream: upstream}

	reqBody := `{"model":"claude-sonnet-4-5","max_tokens":16,"messages":[{"role":"user","content":"hi"}],"stream":false}`
	c, _ := newGatewayTestContext(reqBody)
	c.Request.Header.Set("anthropic-version", "2023-06-01")

	account := &Account{
		ID:          101,
		Name:        "upstream-claude",
		Platform:    PlatformAntigravity,
		Type:        AccountTypeUpstream,
		Schedulable: true,
		Status:      StatusActive,
		Concurrency: 1,
		Credentials: map[string]any{
			"base_url": "https://up.example.com/",
			"api_key":  "sk-upstream",
		},
	}

	_, err := svc.Forward(context.Background(), c, account, []byte(reqBody))
	var failoverErr *UpstreamFailoverError
	require.ErrorAs(t, err, &failoverErr)
	require.Equal(t, http.StatusInternalServerError, failoverErr.StatusCode)

	require.Equal(t, 1, upstream.callCount)
	require.NotNil(t, upstream.lastReq)
	require.Equal(t, "https://up.example.com/antigravity/v1/messages", upstream.lastReq.URL.String())
	require.Equal(t, "Bearer sk-upstream", upstream.lastReq.Header.Get("Authorization"))
	require.Equal(t, "sk-upstream", upstream.lastReq.Header.Get("x-api-key"))
	require.Equal(t, "2023-06-01", upstream.lastReq.Header.Get("anthropic-version"))
}

func TestForwardGemini_UpstreamAccountRoutesToGeminiEndpoint(t *testing.T) {
	upstream := &captureUpstreamRequest{
		statusCode: http.StatusInternalServerError,
		body:       `{"error":{"message":"boom"}}`,
	}
	svc := &AntigravityGatewayService{httpUpstream: upstream}

	reqBody := `{"contents":[{"role":"user","parts":[{"text":"hello"}]}]}`
	c, _ := newGatewayTestContext(reqBody)

	account := &Account{
		ID:          102,
		Name:        "upstream-gemini",
		Platform:    PlatformAntigravity,
		Type:        AccountTypeUpstream,
		Schedulable: true,
		Status:      StatusActive,
		Concurrency: 1,
		Credentials: map[string]any{
			"base_url": "https://up.example.com",
			"api_key":  "sk-upstream",
			"model_mapping": map[string]any{
				"my-custom-model": "gemini-3-pro-high",
			},
		},
	}

	_, err := svc.ForwardGemini(context.Background(), c, account, "my-custom-model", "generateContent", true, []byte(reqBody))
	var failoverErr *UpstreamFailoverError
	require.ErrorAs(t, err, &failoverErr)
	require.Equal(t, http.StatusInternalServerError, failoverErr.StatusCode)

	require.Equal(t, 1, upstream.callCount)
	require.NotNil(t, upstream.lastReq)
	require.Equal(t, "https://up.example.com/antigravity/v1beta/models/gemini-3-pro-high:generateContent?alt=sse", upstream.lastReq.URL.String())
	require.Equal(t, "Bearer sk-upstream", upstream.lastReq.Header.Get("Authorization"))
}

func TestTestConnection_UpstreamAccountUsesDirectEndpoint(t *testing.T) {
	upstream := &captureUpstreamRequest{
		statusCode: http.StatusOK,
		body:       `{"content":[{"text":"pong"}]}`,
	}
	svc := &AntigravityGatewayService{httpUpstream: upstream}

	account := &Account{
		ID:          103,
		Name:        "upstream-test",
		Platform:    PlatformAntigravity,
		Type:        AccountTypeUpstream,
		Schedulable: true,
		Status:      StatusActive,
		Concurrency: 1,
		Credentials: map[string]any{
			"base_url": "https://up.example.com",
			"api_key":  "sk-upstream",
		},
	}

	result, err := svc.TestConnection(context.Background(), account, "claude-sonnet-4-5")
	require.NoError(t, err)
	require.NotNil(t, result)
	require.Equal(t, "pong", result.Text)
	require.Equal(t, "claude-sonnet-4-5", result.MappedModel)

	require.Equal(t, 1, upstream.callCount)
	require.NotNil(t, upstream.lastReq)
	require.Equal(t, "https://up.example.com/antigravity/v1/messages", upstream.lastReq.URL.String())
	require.Equal(t, "Bearer sk-upstream", upstream.lastReq.Header.Get("Authorization"))
	require.Equal(t, "sk-upstream", upstream.lastReq.Header.Get("x-api-key"))
}
