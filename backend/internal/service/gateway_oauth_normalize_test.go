package service

import (
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
)

func TestNormalizeClaudeOAuthRequestBody_NormalizeAndRewriteToolNames(t *testing.T) {
	input := []byte(`{
		"model":"claude-sonnet-4-5",
		"system":[{"type":"text","text":"You are OpenCode, the best coding agent on the planet.","cache_control":{"type":"ephemeral"}}],
		"temperature":0.1,
		"tool_choice":{"type":"tool","name":"Task"},
		"tools":[{"name":"Task"},{"name":"myCustomTool"},{"name":"oc_websearch"}],
		"messages":[{"role":"assistant","content":[{"type":"tool_use","id":"toolu_1","name":"oc_websearch","input":{"query":"x"}}]}]
	}`)

	body, modelID, toolNameMap := normalizeClaudeOAuthRequestBody(input, "claude-sonnet-4-5", claudeOAuthNormalizeOptions{
		stripSystemCacheControl: true,
	})

	require.Equal(t, "claude-sonnet-4-5-20250929", modelID)
	require.Equal(t, "claude-sonnet-4-5-20250929", gjson.GetBytes(body, "model").String())
	require.Equal(t, "Task", gjson.GetBytes(body, "tools.0.name").String())
	require.Equal(t, "MyCustomTool", gjson.GetBytes(body, "tools.1.name").String())
	require.Equal(t, "WebSearch", gjson.GetBytes(body, "tools.2.name").String())
	require.Equal(t, "WebSearch", gjson.GetBytes(body, "messages.0.content.0.name").String())
	require.Equal(t, "myCustomTool", toolNameMap["MyCustomTool"])
	require.Equal(t, "websearch", toolNameMap["WebSearch"])
	require.Equal(t, "You are Claude Code, Anthropic's official CLI for Claude.", gjson.GetBytes(body, "system.0.text").String())
	require.False(t, gjson.GetBytes(body, "system.0.cache_control").Exists())
	require.False(t, gjson.GetBytes(body, "temperature").Exists())
	require.False(t, gjson.GetBytes(body, "tool_choice").Exists())
}

func TestNormalizeClaudeOAuthRequestBody_InjectMetadataWhenMissing(t *testing.T) {
	input := []byte(`{"model":"claude-sonnet-4-5"}`)

	body, _, _ := normalizeClaudeOAuthRequestBody(input, "claude-sonnet-4-5", claudeOAuthNormalizeOptions{
		injectMetadata:          true,
		metadataUserID:          "u_generated",
		stripSystemCacheControl: true,
	})

	require.Equal(t, "u_generated", gjson.GetBytes(body, "metadata.user_id").String())
	require.True(t, gjson.GetBytes(body, "tools").Exists())
	require.Len(t, gjson.GetBytes(body, "tools").Array(), 0)
}

func TestReplaceToolNamesInResponseBody_RestoreOriginalToolName(t *testing.T) {
	service := &GatewayService{}
	toolNameMap := map[string]string{
		"WebSearch":    "websearch",
		"MyCustomTool": "myCustomTool",
	}
	body := []byte(`{
		"type":"message",
		"content":[
			{"type":"tool_use","name":"WebSearch","input":{"q":"a"}},
			{"type":"tool_use","name":"MyCustomTool","input":{"path":"b"}}
		]
	}`)

	rewritten := service.replaceToolNamesInResponseBody(body, toolNameMap)

	require.Equal(t, "websearch", gjson.GetBytes(rewritten, "content.0.name").String())
	require.Equal(t, "myCustomTool", gjson.GetBytes(rewritten, "content.1.name").String())
}

func TestReplaceToolNamesInResponseBody_NoMapNoRewrite(t *testing.T) {
	service := &GatewayService{}
	body := []byte(`{
		"type":"message",
		"content":[
			{"type":"tool_use","name":"WebSearch","input":{"q":"a"}},
			{"type":"tool_use","name":"Task","input":{"path":"b"}}
		]
	}`)

	rewritten := service.replaceToolNamesInResponseBody(body, nil)

	require.JSONEq(t, string(body), string(rewritten))
}

func TestReplaceToolNamesInSSELine_NoMapNoRewrite(t *testing.T) {
	service := &GatewayService{}
	line := `data: {"type":"content_block_delta","delta":{"type":"tool_use","name":"WebSearch"}}`

	rewritten := service.replaceToolNamesInSSELine(line, nil)

	require.Equal(t, line, rewritten)
}

func TestReplaceToolNamesInSSELine_TextFallback(t *testing.T) {
	service := &GatewayService{}
	toolNameMap := map[string]string{
		"WebSearch": "websearch",
	}
	line := `data: {"type":"content_block_delta","name":"WebSearch","model":"claude-sonnet-4-5-20250929"`

	rewritten := service.replaceToolNamesInSSELine(line, toolNameMap)

	require.Equal(t, `data: {"type":"content_block_delta","name":"websearch","model":"claude-sonnet-4-5"`, rewritten)
}

func TestReplaceToolNamesInResponseBody_TextFallback(t *testing.T) {
	service := &GatewayService{}
	toolNameMap := map[string]string{
		"WebSearch": "websearch",
	}
	body := []byte(`{"type":"message","name":"WebSearch","model":"claude-sonnet-4-5-20250929"`)

	rewritten := service.replaceToolNamesInResponseBody(body, toolNameMap)

	require.Equal(t, `{"type":"message","name":"websearch","model":"claude-sonnet-4-5"`, string(rewritten))
}

func TestReplaceToolNamesInResponseBody_StripsPrefixedToolName(t *testing.T) {
	service := &GatewayService{}
	toolNameMap := map[string]string{
		"WebSearch": "websearch",
	}
	body := []byte(`{
		"type":"message",
		"content":[
			{"type":"tool_use","name":"oc_websearch","input":{"q":"a"}}
		]
	}`)

	rewritten := service.replaceToolNamesInResponseBody(body, toolNameMap)

	require.Equal(t, "websearch", gjson.GetBytes(rewritten, "content.0.name").String())
}

func TestReplaceToolNamesInSSELine_StripsPrefixedToolName(t *testing.T) {
	service := &GatewayService{}
	toolNameMap := map[string]string{
		"WebSearch": "websearch",
	}
	line := `data: {"type":"content_block_start","content_block":{"type":"tool_use","name":"mcp_websearch","input":{"q":"x"}}}`

	rewritten := service.replaceToolNamesInSSELine(line, toolNameMap)
	require.GreaterOrEqual(t, len(rewritten), len("data: "))
	data := rewritten[len("data: "):]
	require.Equal(t, "websearch", gjson.Get(data, "content_block.name").String())
}
