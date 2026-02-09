package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/pkg/claude"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestMergeAnthropicBeta(t *testing.T) {
	got := mergeAnthropicBeta(
		[]string{claude.BetaOAuth, claude.BetaInterleavedThinking},
		"foo, oauth-2025-04-20,bar, foo",
	)
	require.Equal(t, "oauth-2025-04-20,interleaved-thinking-2025-05-14,foo,bar", got)
}

func TestMergeAnthropicBeta_EmptyIncoming(t *testing.T) {
	got := mergeAnthropicBeta(
		[]string{claude.BetaOAuth, claude.BetaInterleavedThinking},
		"",
	)
	require.Equal(t, "oauth-2025-04-20,interleaved-thinking-2025-05-14", got)
}

func TestMergeAnthropicBetaDropping(t *testing.T) {
	got := mergeAnthropicBetaDropping(
		[]string{claude.BetaOAuth, claude.BetaInterleavedThinking},
		"claude-code-20250219,foo",
		map[string]struct{}{claude.BetaClaudeCode: {}},
	)
	require.Equal(t, "oauth-2025-04-20,interleaved-thinking-2025-05-14,foo", got)
}

func TestBuildCountTokensRequest_NonMimicUsesCountTokensDefaultWhenClientBetaMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/messages/count_tokens", nil)

	svc := &GatewayService{}
	account := &Account{Type: AccountTypeOAuth}

	req, err := svc.buildCountTokensRequest(
		context.Background(),
		c,
		account,
		[]byte(`{"model":"claude-sonnet-4-5"}`),
		"token",
		"oauth",
		"claude-sonnet-4-5",
		false,
	)
	require.NoError(t, err)
	require.Equal(t, claude.CountTokensBetaHeader, req.Header.Get("anthropic-beta"))
}

func TestBuildCountTokensRequest_MimicMergesRequiredBetas(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/messages/count_tokens", nil)
	c.Request.Header.Set("anthropic-beta", "foo")

	svc := &GatewayService{}
	account := &Account{Type: AccountTypeOAuth}

	req, err := svc.buildCountTokensRequest(
		context.Background(),
		c,
		account,
		[]byte(`{"model":"claude-sonnet-4-5"}`),
		"token",
		"oauth",
		"claude-sonnet-4-5",
		true,
	)
	require.NoError(t, err)
	require.Equal(t, "claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,token-counting-2024-11-01,foo", req.Header.Get("anthropic-beta"))
}

func TestApplyClaudeOAuthHeaderDefaults_SetsAcceptWhenMissing(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/v1/messages", nil)
	req.Header = make(http.Header)

	applyClaudeOAuthHeaderDefaults(req, false)

	require.Equal(t, "application/json", req.Header.Get("accept"))
}

func TestApplyClaudeOAuthHeaderDefaults_KeepsExistingAccept(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/v1/messages", nil)
	req.Header.Set("accept", "text/event-stream")

	applyClaudeOAuthHeaderDefaults(req, true)

	require.Equal(t, "text/event-stream", req.Header.Get("accept"))
	require.Equal(t, "stream", req.Header.Get("x-stainless-helper-method"))
}

func TestBuildUpstreamRequest_MimicDropsClaudeCodeBetaForMessages(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/messages", nil)
	c.Request.Header.Set("anthropic-beta", "claude-code-20250219,foo")

	svc := &GatewayService{}
	account := &Account{Type: AccountTypeOAuth}
	body := []byte(`{"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}]}`)

	req, err := svc.buildUpstreamRequest(
		context.Background(),
		c,
		account,
		body,
		"test-oauth-token",
		"oauth",
		"claude-sonnet-4-5",
		true,
		true,
	)
	require.NoError(t, err)
	require.Equal(t, "oauth-2025-04-20,interleaved-thinking-2025-05-14,foo", req.Header.Get("anthropic-beta"))
	require.Equal(t, "application/json", req.Header.Get("accept"))
	require.Equal(t, "stream", req.Header.Get("x-stainless-helper-method"))
}
