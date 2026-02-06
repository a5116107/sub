package service

import (
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
)

func TestNormalizeClaudeOAuthRequestBody(t *testing.T) {
	input := []byte(`{
		"model":"claude-sonnet-4-5",
		"tools":[{"name":"bash"},{"name":"websearch"}],
		"messages":[{"role":"assistant","content":[{"type":"tool_use","id":"toolu_1","name":"read","input":{"path":"a.txt"}}]}]
	}`)

	body, modelID, toolNameMap := normalizeClaudeOAuthRequestBody(input, "claude-sonnet-4-5")

	require.Equal(t, "claude-sonnet-4-5-20250929", modelID)
	require.Equal(t, "claude-sonnet-4-5-20250929", gjson.GetBytes(body, "model").String())
	require.Equal(t, "Bash", gjson.GetBytes(body, "tools.0.name").String())
	require.Equal(t, "WebSearch", gjson.GetBytes(body, "tools.1.name").String())
	require.Equal(t, "Read", gjson.GetBytes(body, "messages.0.content.0.name").String())

	require.Equal(t, "bash", toolNameMap["Bash"])
	require.Equal(t, "websearch", toolNameMap["WebSearch"])
	require.Equal(t, "read", toolNameMap["Read"])
}

func TestReplaceToolNamesInSSELine(t *testing.T) {
	svc := &GatewayService{}
	toolNameMap := map[string]string{
		"WebSearch": "websearch",
	}
	line := `data: {"type":"content_block_start","content_block":{"type":"tool_use","name":"WebSearch"}}`

	got := svc.replaceToolNamesInSSELine(line, toolNameMap)
	require.Contains(t, got, `"name":"websearch"`)
}

func TestReplaceToolNamesInResponseBody(t *testing.T) {
	svc := &GatewayService{}
	toolNameMap := map[string]string{
		"Read": "read",
	}
	body := []byte(`{"content":[{"type":"tool_use","name":"Read"}]}`)

	got := svc.replaceToolNamesInResponseBody(body, toolNameMap)
	require.Equal(t, "read", gjson.GetBytes(got, "content.0.name").String())
}
