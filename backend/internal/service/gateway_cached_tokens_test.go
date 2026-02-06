package service

import (
	"testing"

	"github.com/stretchr/testify/require"
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
