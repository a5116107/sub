package service

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestGenerateSessionHash_FallbackMixesSessionContext(t *testing.T) {
	svc := &GatewayService{}

	makeParsed := func() *ParsedRequest {
		return &ParsedRequest{
			Messages: []any{
				map[string]any{
					"role":    "user",
					"content": "hello world",
				},
			},
		}
	}

	baseCtx := &SessionHashContext{
		ClientIP:  "1.2.3.4",
		UserAgent: "ua-a",
		APIKeyID:  1001,
	}
	otherCtx := &SessionHashContext{
		ClientIP:  "5.6.7.8",
		UserAgent: "ua-b",
		APIKeyID:  1002,
	}

	h1 := svc.GenerateSessionHashWithContext(makeParsed(), baseCtx)
	h2 := svc.GenerateSessionHashWithContext(makeParsed(), otherCtx)
	h3 := svc.GenerateSessionHashWithContext(makeParsed(), baseCtx)

	require.NotEmpty(t, h1)
	require.NotEmpty(t, h2)
	require.NotEqual(t, h1, h2)
	require.Equal(t, h1, h3)
}

func TestGenerateSessionHash_MetadataSessionIDHasPriority(t *testing.T) {
	svc := &GatewayService{}
	sessionID := "11111111-2222-4333-8aaa-bbbbbbbbbbbb"

	parsed := &ParsedRequest{
		MetadataUserID: "user_demo_account_x_session_" + sessionID,
		Messages: []any{
			map[string]any{
				"role":    "user",
				"content": "hello world",
			},
		},
	}

	got := svc.GenerateSessionHashWithContext(parsed, &SessionHashContext{
		ClientIP:  "9.9.9.9",
		UserAgent: "ua-c",
		APIKeyID:  2001,
	})
	require.Equal(t, sessionID, got)
}

func TestGenerateSessionHash_GeminiPartsFallback(t *testing.T) {
	svc := &GatewayService{}

	parsed := &ParsedRequest{
		Messages: []any{
			map[string]any{
				"role": "user",
				"parts": []any{
					map[string]any{"text": "hello"},
					map[string]any{"text": " world"},
				},
			},
		},
	}

	h1 := svc.GenerateSessionHash(parsed)
	h2 := svc.GenerateSessionHash(parsed)

	require.NotEmpty(t, h1)
	require.Equal(t, h1, h2)
}
