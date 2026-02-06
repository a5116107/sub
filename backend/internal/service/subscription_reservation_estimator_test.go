package service

import "testing"

func TestEstimateTokensForReservation_OpenAIFallbackMaxTokens(t *testing.T) {
	t.Parallel()

	body := []byte(`{"messages":[{"role":"user","content":"hello"}]}`)
	in, out := estimateTokensForReservation(SubscriptionReserveOpenAI, body)
	if in != len(body)/4 {
		t.Fatalf("expected inputTokens=%d, got %d", len(body)/4, in)
	}
	if out != 8192 {
		t.Fatalf("expected outputTokens=8192, got %d", out)
	}
}

func TestEstimateTokensForReservation_OpenAIUsesMaxOutputTokens(t *testing.T) {
	t.Parallel()

	body := []byte(`{"max_output_tokens":1234,"messages":[{"role":"user","content":"hello"}]}`)
	_, out := estimateTokensForReservation(SubscriptionReserveOpenAI, body)
	if out != 1234 {
		t.Fatalf("expected outputTokens=1234, got %d", out)
	}
}

func TestEstimateTokensForReservation_NonASCIIUsesConservativeInput(t *testing.T) {
	t.Parallel()

	body := []byte(`{"messages":[{"role":"user","content":"你好你好你好你好你好你好你好你好你好你好"}]}`)
	in, _ := estimateTokensForReservation(SubscriptionReserveOpenAI, body)
	if in != len(body)/2 {
		t.Fatalf("expected inputTokens=%d, got %d", len(body)/2, in)
	}
}
