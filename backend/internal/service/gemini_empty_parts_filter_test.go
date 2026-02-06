package service

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestFilterEmptyPartsFromGeminiRequest_RemovesEmptyPartsMessages(t *testing.T) {
	body := []byte(`{
		"contents": [
			{"role": "user", "parts": [{"text": "hello"}]},
			{"role": "assistant", "parts": []},
			{"role": "assistant", "parts": [{"text": "world"}]}
		]
	}`)

	filtered, err := filterEmptyPartsFromGeminiRequest(body)
	require.NoError(t, err)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(filtered, &payload))

	contents, ok := payload["contents"].([]any)
	require.True(t, ok)
	require.Len(t, contents, 2)
}

func TestFilterEmptyPartsFromGeminiRequest_UnchangedWhenNoEmptyParts(t *testing.T) {
	body := []byte(`{"contents":[{"role":"user","parts":[{"text":"hello"}]}]}`)

	filtered, err := filterEmptyPartsFromGeminiRequest(body)
	require.NoError(t, err)
	require.Equal(t, string(body), string(filtered))
}

func TestFilterEmptyPartsFromGeminiRequest_InvalidJSON(t *testing.T) {
	_, err := filterEmptyPartsFromGeminiRequest([]byte("{invalid"))
	require.Error(t, err)
}
