package service

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"testing"
)

func TestGeminiCheckErrorPolicyInLoop_CustomErrorCodesSkip(t *testing.T) {
	svc := &GeminiMessagesCompatService{rateLimitService: &RateLimitService{}}
	account := &Account{
		ID:   201,
		Type: AccountTypeAPIKey,
		Credentials: map[string]any{
			"custom_error_codes_enabled": true,
			"custom_error_codes":         []any{401.0, 500.0},
		},
	}
	body := []byte(`{"error":{"message":"quota exceeded"}}`)
	resp := &http.Response{
		StatusCode: http.StatusTooManyRequests,
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       io.NopCloser(bytes.NewReader(body)),
	}

	matched, rebuilt := svc.checkErrorPolicyInLoop(context.Background(), account, resp)
	if !matched {
		t.Fatalf("expected matched=true when custom error code policy skips status")
	}
	if rebuilt == nil {
		t.Fatalf("expected rebuilt response")
	}
	gotBody, _ := io.ReadAll(rebuilt.Body)
	if string(gotBody) != string(body) {
		t.Fatalf("expected rebuilt body %q, got %q", string(body), string(gotBody))
	}
}

func TestGeminiCheckErrorPolicyInLoop_NoPolicyMatch(t *testing.T) {
	svc := &GeminiMessagesCompatService{rateLimitService: &RateLimitService{}}
	account := &Account{
		ID:          202,
		Type:        AccountTypeAPIKey,
		Credentials: map[string]any{},
	}
	body := []byte(`{"error":{"message":"rate limited"}}`)
	resp := &http.Response{
		StatusCode: http.StatusTooManyRequests,
		Header:     http.Header{"Content-Type": []string{"application/json"}},
		Body:       io.NopCloser(bytes.NewReader(body)),
	}

	matched, rebuilt := svc.checkErrorPolicyInLoop(context.Background(), account, resp)
	if matched {
		t.Fatalf("expected matched=false when no error policy is active")
	}
	gotBody, _ := io.ReadAll(rebuilt.Body)
	if string(gotBody) != string(body) {
		t.Fatalf("expected rebuilt body %q, got %q", string(body), string(gotBody))
	}
}
