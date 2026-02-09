package service

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

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

func TestClientStatusForSkippedCustomErrorPolicy(t *testing.T) {
	tests := []struct {
		name           string
		account        *Account
		upstreamStatus int
		expectStatus   int
		expectSkipped  bool
	}{
		{
			name:           "nil account keeps upstream status",
			account:        nil,
			upstreamStatus: http.StatusTooManyRequests,
			expectStatus:   http.StatusTooManyRequests,
			expectSkipped:  false,
		},
		{
			name: "custom error code disabled keeps upstream status",
			account: &Account{
				Type: AccountTypeAPIKey,
				Credentials: map[string]any{
					"custom_error_codes_enabled": false,
				},
			},
			upstreamStatus: http.StatusInternalServerError,
			expectStatus:   http.StatusInternalServerError,
			expectSkipped:  false,
		},
		{
			name: "custom error code enabled and matched keeps upstream status",
			account: &Account{
				Type: AccountTypeAPIKey,
				Credentials: map[string]any{
					"custom_error_codes_enabled": true,
					"custom_error_codes":         []any{float64(http.StatusTooManyRequests)},
				},
			},
			upstreamStatus: http.StatusTooManyRequests,
			expectStatus:   http.StatusTooManyRequests,
			expectSkipped:  false,
		},
		{
			name: "custom error code enabled and skipped maps to 500",
			account: &Account{
				Type: AccountTypeAPIKey,
				Credentials: map[string]any{
					"custom_error_codes_enabled": true,
					"custom_error_codes":         []any{float64(599)},
				},
			},
			upstreamStatus: http.StatusTooManyRequests,
			expectStatus:   http.StatusInternalServerError,
			expectSkipped:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status, skipped := clientStatusForSkippedCustomErrorPolicy(tt.account, tt.upstreamStatus)
			require.Equal(t, tt.expectStatus, status)
			require.Equal(t, tt.expectSkipped, skipped)
		})
	}
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

type upstreamResponseStep struct {
	statusCode int
	body       string
	headers    http.Header
}

type sequenceUpstreamRequest struct {
	steps []upstreamResponseStep
	urls  []string
}

func (s *sequenceUpstreamRequest) Do(req *http.Request, proxyURL string, accountID int64, accountConcurrency int) (*http.Response, error) {
	s.urls = append(s.urls, req.URL.String())
	stepIdx := len(s.urls) - 1
	if stepIdx >= len(s.steps) {
		stepIdx = len(s.steps) - 1
	}
	step := s.steps[stepIdx]

	respHeaders := make(http.Header)
	for k, values := range step.headers {
		respHeaders[k] = append([]string(nil), values...)
	}

	return &http.Response{
		StatusCode: step.statusCode,
		Header:     respHeaders,
		Body:       io.NopCloser(strings.NewReader(step.body)),
	}, nil
}

func (s *sequenceUpstreamRequest) DoWithTLS(req *http.Request, proxyURL string, accountID int64, accountConcurrency int, enableTLSFingerprint bool) (*http.Response, error) {
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
	c.Request.Header.Set("anthropic-beta", "beta-flag")
	c.Request.Header.Set("X-Custom-Trace", "trace-001")
	c.Request.Header.Set("Connection", "keep-alive")
	c.Request.Header.Set("Authorization", "Bearer client-token")

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
	require.Equal(t, "beta-flag", upstream.lastReq.Header.Get("anthropic-beta"))
	require.Equal(t, "trace-001", upstream.lastReq.Header.Get("X-Custom-Trace"))
	require.Empty(t, upstream.lastReq.Header.Get("Connection"))
}

func TestForwardGemini_UpstreamAccountRoutesToGeminiEndpoint(t *testing.T) {
	upstream := &captureUpstreamRequest{
		statusCode: http.StatusInternalServerError,
		body:       `{"error":{"message":"boom"}}`,
	}
	svc := &AntigravityGatewayService{httpUpstream: upstream}

	reqBody := `{"contents":[{"role":"user","parts":[{"text":"hello"}]}]}`
	c, _ := newGatewayTestContext(reqBody)
	c.Request.Header.Set("X-Goog-Api-Client", "gl-go/1.22")
	c.Request.Header.Set("Connection", "close")
	c.Request.Header.Set("Authorization", "Bearer client-token")

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
	require.Equal(t, "gl-go/1.22", upstream.lastReq.Header.Get("X-Goog-Api-Client"))
	require.Empty(t, upstream.lastReq.Header.Get("Connection"))
}

func TestForward_UpstreamAccountBaseURLWithAntigravitySuffix(t *testing.T) {
	upstream := &captureUpstreamRequest{
		statusCode: http.StatusInternalServerError,
		body:       `{"error":{"message":"boom"}}`,
	}
	svc := &AntigravityGatewayService{httpUpstream: upstream}

	reqBody := `{"model":"claude-sonnet-4-5","max_tokens":16,"messages":[{"role":"user","content":"hi"}],"stream":false}`
	c, _ := newGatewayTestContext(reqBody)
	c.Request.Header.Set("anthropic-version", "2023-06-01")

	account := &Account{
		ID:          111,
		Name:        "upstream-claude-suffix",
		Platform:    PlatformAntigravity,
		Type:        AccountTypeUpstream,
		Schedulable: true,
		Status:      StatusActive,
		Concurrency: 1,
		Credentials: map[string]any{
			"base_url": "https://up.example.com/antigravity/",
			"api_key":  "sk-upstream",
		},
	}

	_, err := svc.Forward(context.Background(), c, account, []byte(reqBody))
	var failoverErr *UpstreamFailoverError
	require.ErrorAs(t, err, &failoverErr)
	require.Equal(t, "https://up.example.com/antigravity/v1/messages", upstream.lastReq.URL.String())
}

func TestForwardGemini_UpstreamAccountBaseURLWithAntigravitySuffix(t *testing.T) {
	upstream := &captureUpstreamRequest{
		statusCode: http.StatusInternalServerError,
		body:       `{"error":{"message":"boom"}}`,
	}
	svc := &AntigravityGatewayService{httpUpstream: upstream}

	reqBody := `{"contents":[{"role":"user","parts":[{"text":"hello"}]}]}`
	c, _ := newGatewayTestContext(reqBody)

	account := &Account{
		ID:          112,
		Name:        "upstream-gemini-suffix",
		Platform:    PlatformAntigravity,
		Type:        AccountTypeUpstream,
		Schedulable: true,
		Status:      StatusActive,
		Concurrency: 1,
		Credentials: map[string]any{
			"base_url": "https://up.example.com/antigravity",
			"api_key":  "sk-upstream",
			"model_mapping": map[string]any{
				"my-custom-model": "gemini-3-pro-high",
			},
		},
	}

	_, err := svc.ForwardGemini(context.Background(), c, account, "my-custom-model", "generateContent", true, []byte(reqBody))
	var failoverErr *UpstreamFailoverError
	require.ErrorAs(t, err, &failoverErr)
	require.Equal(t, "https://up.example.com/antigravity/v1beta/models/gemini-3-pro-high:generateContent?alt=sse", upstream.lastReq.URL.String())
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

func TestTestConnection_UsesForwardBaseURLOrderForFallback(t *testing.T) {
	originalBaseURLs := append([]string(nil), antigravity.BaseURLs...)
	originalBaseURL := antigravity.BaseURL
	originalAvailability := antigravity.DefaultURLAvailability
	t.Cleanup(func() {
		antigravity.BaseURLs = originalBaseURLs
		antigravity.BaseURL = originalBaseURL
		antigravity.DefaultURLAvailability = originalAvailability
	})

	antigravity.BaseURLs = []string{
		"https://cloudcode-pa.googleapis.com",
		"https://daily-cloudcode-pa.sandbox.googleapis.com",
	}
	antigravity.BaseURL = antigravity.BaseURLs[0]
	antigravity.DefaultURLAvailability = antigravity.NewURLAvailability(time.Minute)

	upstream := &sequenceUpstreamRequest{
		steps: []upstreamResponseStep{
			{statusCode: http.StatusTooManyRequests, body: `{"error":"rate_limited"}`},
			{statusCode: http.StatusOK, body: "data: {\"response\":{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"pong\"}]}}]}}\n\n"},
		},
	}
	svc := &AntigravityGatewayService{
		tokenProvider: &AntigravityTokenProvider{},
		httpUpstream:  upstream,
	}

	account := &Account{
		ID:          104,
		Name:        "apikey-test",
		Platform:    PlatformAntigravity,
		Type:        AccountTypeAPIKey,
		Schedulable: true,
		Status:      StatusActive,
		Concurrency: 1,
		Credentials: map[string]any{
			"api_key":    "sk-apikey",
			"project_id": "proj-1",
		},
	}

	result, err := svc.TestConnection(context.Background(), account, "gemini-3-flash")
	require.NoError(t, err)
	require.NotNil(t, result)
	require.Equal(t, "pong", result.Text)
	require.GreaterOrEqual(t, len(upstream.urls), 2)
	require.Contains(t, upstream.urls[0], "daily-cloudcode-pa.sandbox.googleapis.com")
	require.Contains(t, upstream.urls[1], "cloudcode-pa.googleapis.com")
}

func TestCopyUpstreamResponseHeaders_FiltersHopByHop(t *testing.T) {
	c, _ := newGatewayTestContext(`{}`)

	src := http.Header{}
	src.Add("X-Upstream-Request-Id", "req-1")
	src.Add("X-Upstream-Request-Id", "req-2")
	src.Add("Connection", "keep-alive")
	src.Add("Transfer-Encoding", "chunked")

	copyUpstreamResponseHeaders(c, src)

	require.Equal(t, []string{"req-1", "req-2"}, c.Writer.Header().Values("X-Upstream-Request-Id"))
	require.Empty(t, c.Writer.Header().Get("Connection"))
	require.Empty(t, c.Writer.Header().Get("Transfer-Encoding"))
}

func TestParseGeminiRateLimitResetTime_UsesRetryDelay(t *testing.T) {
	body := []byte(`{"error":{"details":[{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"3s"}]}}`)

	before := time.Now()
	resetAt := ParseGeminiRateLimitResetTime(body)
	require.NotNil(t, resetAt)
	require.WithinDuration(t, before.Add(3*time.Second), time.Unix(*resetAt, 0), 2*time.Second)
}

func TestNormalizeUpstreamBaseURL(t *testing.T) {
	require.Equal(t, "https://up.example.com", normalizeUpstreamBaseURL("https://up.example.com"))
	require.Equal(t, "https://up.example.com", normalizeUpstreamBaseURL("https://up.example.com/"))
	require.Equal(t, "https://up.example.com", normalizeUpstreamBaseURL("https://up.example.com/antigravity"))
	require.Equal(t, "https://up.example.com", normalizeUpstreamBaseURL("https://up.example.com/antigravity/"))
	require.Equal(t, "", normalizeUpstreamBaseURL("   "))
}

func TestMapAntigravityModelForScheduling_WildcardMapping(t *testing.T) {
	account := &Account{
		Platform: PlatformAntigravity,
		Credentials: map[string]any{
			"model_mapping": map[string]any{
				"claude-*": "claude-sonnet-4-5",
			},
		},
	}

	require.Equal(t, "claude-sonnet-4-5", mapAntigravityModelForScheduling(account, "claude-opus-4-6"))
	require.Equal(t, "claude-sonnet-4-5", mapAntigravityModelForScheduling(account, "claude-sonnet-4-5"))
	require.Equal(t, "", mapAntigravityModelForScheduling(account, "gpt-4o"))
}

func TestApplyThinkingModelSuffix(t *testing.T) {
	require.Equal(t, "claude-sonnet-4-5", applyThinkingModelSuffix("claude-sonnet-4-5", false))
	require.Equal(t, "claude-sonnet-4-5-thinking", applyThinkingModelSuffix("claude-sonnet-4-5", true))
	require.Equal(t, "claude-opus-4-6-thinking", applyThinkingModelSuffix("claude-opus-4-6-thinking", true))
}

func TestForward_UpstreamAccountSuccessPassthroughBody(t *testing.T) {
	upstream := &captureUpstreamRequest{
		statusCode: http.StatusOK,
		body:       "data: {\"type\":\"message_start\"}\n\ndata: [DONE]\n\n",
		headers: http.Header{
			"Content-Type": []string{"text/event-stream"},
			"X-Trace-Id":   []string{"trace-123"},
			"Connection":   []string{"keep-alive"},
			"X-Request-Id": []string{"req-up-1"},
		},
	}
	svc := &AntigravityGatewayService{httpUpstream: upstream}

	reqBody := `{"model":"claude-sonnet-4-5","max_tokens":16,"messages":[{"role":"user","content":"hi"}],"stream":true}`
	c, rec := newGatewayTestContext(reqBody)
	c.Request.Header.Set("anthropic-version", "2023-06-01")

	account := &Account{
		ID:          201,
		Name:        "upstream-claude-ok",
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

	result, err := svc.Forward(context.Background(), c, account, []byte(reqBody))
	require.NoError(t, err)
	require.NotNil(t, result)
	require.Equal(t, http.StatusOK, rec.Code)
	require.Equal(t, upstream.body, rec.Body.String())
	require.Equal(t, "text/event-stream", rec.Header().Get("Content-Type"))
	require.Equal(t, "trace-123", rec.Header().Get("X-Trace-Id"))
	require.Empty(t, rec.Header().Get("Connection"))
	require.Equal(t, "req-up-1", result.RequestID)
	require.Equal(t, ClaudeUsage{}, result.Usage)
}

func TestForwardGemini_UpstreamAccountSuccessPassthroughBody(t *testing.T) {
	upstream := &captureUpstreamRequest{
		statusCode: http.StatusOK,
		body:       "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"ok\"}]}}]}\n\n",
		headers: http.Header{
			"Content-Type": []string{"text/event-stream"},
			"X-Upstream":   []string{"gemini"},
			"Connection":   []string{"close"},
			"X-Request-Id": []string{"req-up-gm-1"},
		},
	}
	svc := &AntigravityGatewayService{httpUpstream: upstream}

	reqBody := `{"contents":[{"role":"user","parts":[{"text":"hello"}]}]}`
	c, rec := newGatewayTestContext(reqBody)

	account := &Account{
		ID:          202,
		Name:        "upstream-gemini-ok",
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

	result, err := svc.ForwardGemini(context.Background(), c, account, "my-custom-model", "generateContent", true, []byte(reqBody))
	require.NoError(t, err)
	require.NotNil(t, result)
	require.Equal(t, http.StatusOK, rec.Code)
	require.Equal(t, upstream.body, rec.Body.String())
	require.Equal(t, "text/event-stream", rec.Header().Get("Content-Type"))
	require.Equal(t, "gemini", rec.Header().Get("X-Upstream"))
	require.Empty(t, rec.Header().Get("Connection"))
	require.Equal(t, "req-up-gm-1", result.RequestID)
	require.Equal(t, ClaudeUsage{}, result.Usage)
}
