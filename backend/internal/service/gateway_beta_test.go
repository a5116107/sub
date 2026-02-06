package service

import (
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/pkg/claude"
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
