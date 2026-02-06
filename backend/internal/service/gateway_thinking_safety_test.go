package service

import (
	"bytes"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestReplaceModelInBody_PreservesMessagesRawBytes(t *testing.T) {
	svc := &GatewayService{}
	originalBody := []byte(`{
		"model":"claude-sonnet-4-5",
		"messages":[{"role":"assistant","content":[{"type":"thinking","thinking":"plan","signature":"sig","extra":{"v":1.0}}]}],
		"temperature":1.0
	}`)

	rewritten := svc.replaceModelInBody(originalBody, "claude-opus-4-5")

	originalRaw := mustParseTopLevelRaw(t, originalBody)
	rewrittenRaw := mustParseTopLevelRaw(t, rewritten)

	var model string
	require.NoError(t, json.Unmarshal(rewrittenRaw["model"], &model))
	require.Equal(t, "claude-opus-4-5", model)
	require.True(t, bytes.Equal(originalRaw["messages"], rewrittenRaw["messages"]))
}

func TestIsThinkingBlockSignatureError_DetectsCannotBeModified(t *testing.T) {
	svc := &GatewayService{}
	respBody := []byte(`{"error":{"message":"thinking or redacted_thinking blocks in the latest assistant message cannot be modified"}}`)
	require.True(t, svc.isThinkingBlockSignatureError(respBody))
}

func TestIsSignatureRelatedError_DetectsCannotBeModified(t *testing.T) {
	respBody := []byte(`{"error":{"message":"thinking or redacted_thinking blocks in the latest assistant message cannot be modified"}}`)
	require.True(t, isSignatureRelatedError(respBody))
}

func mustParseTopLevelRaw(t *testing.T, body []byte) map[string]json.RawMessage {
	t.Helper()
	out := make(map[string]json.RawMessage)
	require.NoError(t, json.Unmarshal(body, &out))
	return out
}
