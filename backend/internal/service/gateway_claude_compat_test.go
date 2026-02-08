package service

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestClaudeCodeCompatMode(t *testing.T) {
	tests := []struct {
		name string
		mode string
		want string
	}{
		{name: "default empty -> auto", mode: "", want: "auto"},
		{name: "auto", mode: "auto", want: "auto"},
		{name: "auto case-insensitive", mode: "AUTO", want: "auto"},
		{name: "always", mode: "always", want: "always"},
		{name: "never", mode: "never", want: "never"},
		{name: "unknown -> auto", mode: "something", want: "auto"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := &GatewayService{
				cfg: &config.Config{
					Gateway: config.GatewayConfig{
						ClaudeCodeCompat: config.GatewayClaudeCodeCompatConfig{
							Mode: tt.mode,
						},
					},
				},
			}

			require.Equal(t, tt.want, svc.claudeCodeCompatMode())
		})
	}
}

func TestShouldApplyClaudeCodeCompat(t *testing.T) {
	claudeUA := "claude-cli/2.0.62 (external, cli)"
	claudeUserID := "session_123e4567-e89b-12d3-a456-426614174000"

	tests := []struct {
		name      string
		mode      string
		userAgent string
		userID    string
		want      bool
	}{
		{name: "auto: non-claude", mode: "auto", userAgent: "curl/8.0", userID: claudeUserID, want: true},
		{name: "auto: claude client", mode: "auto", userAgent: claudeUA, userID: claudeUserID, want: false},
		{name: "always: claude client", mode: "always", userAgent: claudeUA, userID: claudeUserID, want: true},
		{name: "always: non-claude", mode: "always", userAgent: "curl/8.0", userID: claudeUserID, want: true},
		{name: "never: claude client", mode: "never", userAgent: claudeUA, userID: claudeUserID, want: false},
		{name: "never: non-claude", mode: "never", userAgent: "curl/8.0", userID: claudeUserID, want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := &GatewayService{
				cfg: &config.Config{
					Gateway: config.GatewayConfig{
						ClaudeCodeCompat: config.GatewayClaudeCodeCompatConfig{
							Mode: tt.mode,
						},
					},
				},
			}

			require.Equal(t, tt.want, svc.shouldApplyClaudeCodeCompat(tt.userAgent, tt.userID))
		})
	}
}

func TestShouldApplyClaudeCodeCompatByRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	req := httptest.NewRequest(http.MethodPost, "/v1/messages/count_tokens", nil)
	req.Header.Set("User-Agent", "claude-cli/2.1.22 (external, cli)")
	c.Request = req

	svc := &GatewayService{
		cfg: &config.Config{
			Gateway: config.GatewayConfig{
				ClaudeCodeCompat: config.GatewayClaudeCodeCompatConfig{
					Mode: "auto",
				},
			},
		},
	}

	t.Run("context marks claude client", func(t *testing.T) {
		ctx := SetClaudeCodeClient(context.Background(), true)
		require.False(t, svc.shouldApplyClaudeCodeCompatByRequest(ctx, c, nil))
	})

	t.Run("fallback to ua+metadata when context not marked", func(t *testing.T) {
		ctx := context.Background()
		require.True(t, svc.shouldApplyClaudeCodeCompatByRequest(ctx, c, &ParsedRequest{}))
		require.False(t, svc.shouldApplyClaudeCodeCompatByRequest(ctx, c, &ParsedRequest{
			MetadataUserID: "session_123e4567-e89b-12d3-a456-426614174000",
		}))
	})
}
