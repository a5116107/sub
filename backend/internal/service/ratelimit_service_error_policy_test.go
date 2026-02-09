package service

import (
	"context"
	"testing"
)

func TestRateLimitServiceCheckErrorPolicy_CustomErrorCodes(t *testing.T) {
	svc := &RateLimitService{}
	account := &Account{
		ID:   101,
		Type: AccountTypeAPIKey,
		Credentials: map[string]any{
			"custom_error_codes_enabled": true,
			"custom_error_codes":         []any{401.0, 500.0},
		},
	}

	if got := svc.CheckErrorPolicy(context.Background(), account, 429, []byte(`{"error":"rate limited"}`)); got != ErrorPolicySkipped {
		t.Fatalf("expected ErrorPolicySkipped, got %v", got)
	}
	if got := svc.CheckErrorPolicy(context.Background(), account, 500, []byte(`{"error":"upstream"}`)); got != ErrorPolicyMatched {
		t.Fatalf("expected ErrorPolicyMatched, got %v", got)
	}
}

func TestRateLimitServiceCheckErrorPolicy_None(t *testing.T) {
	svc := &RateLimitService{}
	account := &Account{
		ID:          102,
		Type:        AccountTypeAPIKey,
		Credentials: map[string]any{},
	}

	if got := svc.CheckErrorPolicy(context.Background(), account, 429, []byte(`{"error":"rate limited"}`)); got != ErrorPolicyNone {
		t.Fatalf("expected ErrorPolicyNone, got %v", got)
	}
	if got := svc.CheckErrorPolicy(context.Background(), nil, 429, nil); got != ErrorPolicyNone {
		t.Fatalf("expected ErrorPolicyNone for nil account, got %v", got)
	}
}
