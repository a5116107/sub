package service

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

func TestApplyCachedTokensFallback(t *testing.T) {
	cacheRead := 0
	applyCachedTokensFallback(&cacheRead, 12)
	require.Equal(t, 12, cacheRead)

	cacheRead = 5
	applyCachedTokensFallback(&cacheRead, 20)
	require.Equal(t, 5, cacheRead)

	cacheRead = 0
	applyCachedTokensFallback(&cacheRead, 0)
	require.Equal(t, 0, cacheRead)
}

func TestParseSSEUsage_CachedTokensFallbackMessageStart(t *testing.T) {
	svc := &GatewayService{}
	usage := &ClaudeUsage{}

	svc.parseSSEUsage(`{"type":"message_start","message":{"usage":{"input_tokens":10,"cached_tokens":7}}}`, usage)

	require.Equal(t, 10, usage.InputTokens)
	require.Equal(t, 7, usage.CacheReadInputTokens)
}

func TestParseSSEUsage_CachedTokensFallbackMessageDelta(t *testing.T) {
	svc := &GatewayService{}
	usage := &ClaudeUsage{}

	svc.parseSSEUsage(`{"type":"message_delta","usage":{"output_tokens":3,"cached_tokens":6}}`, usage)

	require.Equal(t, 3, usage.OutputTokens)
	require.Equal(t, 6, usage.CacheReadInputTokens)
}

func TestParseSSEUsage_PrefersStandardCacheReadTokens(t *testing.T) {
	svc := &GatewayService{}
	usage := &ClaudeUsage{}

	svc.parseSSEUsage(`{"type":"message_start","message":{"usage":{"cache_read_input_tokens":9,"cached_tokens":7}}}`, usage)

	require.Equal(t, 9, usage.CacheReadInputTokens)
}

func TestParseSSEUsage_MessageDeltaPreservesExistingInputTokens(t *testing.T) {
	svc := &GatewayService{}
	usage := &ClaudeUsage{
		InputTokens: 100,
	}

	svc.parseSSEUsage(`{"type":"message_delta","usage":{"output_tokens":7,"cached_tokens":15}}`, usage)

	require.Equal(t, 100, usage.InputTokens)
	require.Equal(t, 7, usage.OutputTokens)
	require.Equal(t, 15, usage.CacheReadInputTokens)
}

func TestParseSSEUsage_MessageDeltaKeepsStandardCacheReadTokens(t *testing.T) {
	svc := &GatewayService{}
	usage := &ClaudeUsage{}

	svc.parseSSEUsage(`{"type":"message_delta","usage":{"cache_read_input_tokens":9,"cached_tokens":15}}`, usage)

	require.Equal(t, 9, usage.CacheReadInputTokens)
}

func TestNonStreamingReconcile_KimiResponse(t *testing.T) {
	body := []byte(`{
		"usage": {
			"input_tokens": 23,
			"output_tokens": 7,
			"cache_creation_input_tokens": 0,
			"cache_read_input_tokens": 0,
			"cached_tokens": 23
		}
	}`)

	var response struct {
		Usage ClaudeUsage `json:"usage"`
	}
	require.NoError(t, json.Unmarshal(body, &response))

	if response.Usage.CacheReadInputTokens == 0 {
		cachedTokens := int(gjson.GetBytes(body, "usage.cached_tokens").Int())
		if cachedTokens > 0 {
			response.Usage.CacheReadInputTokens = cachedTokens
			if newBody, err := sjson.SetBytes(body, "usage.cache_read_input_tokens", cachedTokens); err == nil {
				body = newBody
			}
		}
	}

	assert.Equal(t, 23, response.Usage.CacheReadInputTokens)
	assert.Equal(t, int64(23), gjson.GetBytes(body, "usage.cache_read_input_tokens").Int())
}

func TestNonStreamingReconcile_NativeClaude(t *testing.T) {
	body := []byte(`{
		"usage": {
			"input_tokens": 100,
			"output_tokens": 50,
			"cache_creation_input_tokens": 20,
			"cache_read_input_tokens": 30
		}
	}`)

	var response struct {
		Usage ClaudeUsage `json:"usage"`
	}
	require.NoError(t, json.Unmarshal(body, &response))

	assert.Equal(t, 30, response.Usage.CacheReadInputTokens)
}

func TestNonStreamingReconcile_NoCachedTokens(t *testing.T) {
	body := []byte(`{
		"usage": {
			"input_tokens": 100,
			"output_tokens": 50,
			"cache_creation_input_tokens": 0,
			"cache_read_input_tokens": 0
		}
	}`)

	var response struct {
		Usage ClaudeUsage `json:"usage"`
	}
	require.NoError(t, json.Unmarshal(body, &response))

	if response.Usage.CacheReadInputTokens == 0 {
		cachedTokens := int(gjson.GetBytes(body, "usage.cached_tokens").Int())
		if cachedTokens > 0 {
			response.Usage.CacheReadInputTokens = cachedTokens
			if newBody, err := sjson.SetBytes(body, "usage.cache_read_input_tokens", cachedTokens); err == nil {
				body = newBody
			}
		}
	}

	assert.Equal(t, 0, response.Usage.CacheReadInputTokens)
	assert.Equal(t, int64(0), gjson.GetBytes(body, "usage.cache_read_input_tokens").Int())
}
