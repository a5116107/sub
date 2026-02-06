package service

import (
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
)

func TestNormalizeClaudeOAuthRequestBody_NormalizeWithoutToolRewrite(t *testing.T) {
	input := []byte(`{
		"model":"claude-sonnet-4-5",
		"system":[{"type":"text","text":"You are OpenCode, the best coding agent on the planet.","cache_control":{"type":"ephemeral"}}],
		"temperature":0.1,
		"tool_choice":{"type":"tool","name":"Task"},
		"tools":[{"name":"Task"},{"name":"myCustomTool"}],
		"messages":[{"role":"assistant","content":[{"type":"tool_use","id":"toolu_1","name":"Task","input":{"path":"a.txt"}}]}]
	}`)

	body, modelID := normalizeClaudeOAuthRequestBody(input, "claude-sonnet-4-5", claudeOAuthNormalizeOptions{
		stripSystemCacheControl: true,
	})

	require.Equal(t, "claude-sonnet-4-5-20250929", modelID)
	require.Equal(t, "claude-sonnet-4-5-20250929", gjson.GetBytes(body, "model").String())
	require.Equal(t, "Task", gjson.GetBytes(body, "tools.0.name").String())
	require.Equal(t, "myCustomTool", gjson.GetBytes(body, "tools.1.name").String())
	require.Equal(t, "Task", gjson.GetBytes(body, "messages.0.content.0.name").String())
	require.Equal(t, "You are Claude Code, Anthropic's official CLI for Claude.", gjson.GetBytes(body, "system.0.text").String())
	require.False(t, gjson.GetBytes(body, "system.0.cache_control").Exists())
	require.False(t, gjson.GetBytes(body, "temperature").Exists())
	require.False(t, gjson.GetBytes(body, "tool_choice").Exists())
}

func TestNormalizeClaudeOAuthRequestBody_InjectMetadataWhenMissing(t *testing.T) {
	input := []byte(`{"model":"claude-sonnet-4-5"}`)

	body, _ := normalizeClaudeOAuthRequestBody(input, "claude-sonnet-4-5", claudeOAuthNormalizeOptions{
		injectMetadata:          true,
		metadataUserID:          "u_generated",
		stripSystemCacheControl: true,
	})

	require.Equal(t, "u_generated", gjson.GetBytes(body, "metadata.user_id").String())
	require.True(t, gjson.GetBytes(body, "tools").Exists())
	require.Len(t, gjson.GetBytes(body, "tools").Array(), 0)
}
