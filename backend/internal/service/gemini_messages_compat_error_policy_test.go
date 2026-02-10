package service

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/gin-gonic/gin"
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

type geminiHTTPUpstreamStub struct {
	statusCode int
	body       string
	headers    http.Header
	calls      int
}

func (s *geminiHTTPUpstreamStub) Do(req *http.Request, proxyURL string, accountID int64, accountConcurrency int) (*http.Response, error) {
	s.calls++
	respHeaders := make(http.Header)
	for k, values := range s.headers {
		respHeaders[k] = append([]string(nil), values...)
	}
	return &http.Response{
		StatusCode: s.statusCode,
		Header:     respHeaders,
		Body:       io.NopCloser(strings.NewReader(s.body)),
	}, nil
}

func (s *geminiHTTPUpstreamStub) DoWithTLS(req *http.Request, proxyURL string, accountID int64, accountConcurrency int, enableTLSFingerprint bool) (*http.Response, error) {
	return s.Do(req, proxyURL, accountID, accountConcurrency)
}

type geminiRateLimitRepoSpy struct {
	AccountRepository

	setRateLimitedCalls int
}

func (s *geminiRateLimitRepoSpy) SetRateLimited(ctx context.Context, id int64, resetAt time.Time) error {
	s.setRateLimitedCalls++
	return nil
}

func TestGeminiHandleUpstreamError_CustomErrorCodeMismatchSkipsRateLimit(t *testing.T) {
	t.Parallel()

	repo := &geminiRateLimitRepoSpy{}
	svc := &GeminiMessagesCompatService{
		accountRepo:      repo,
		rateLimitService: &RateLimitService{accountRepo: repo},
	}
	account := &Account{
		ID:   301,
		Type: AccountTypeAPIKey,
		Credentials: map[string]any{
			"custom_error_codes_enabled": true,
			"custom_error_codes":         []any{float64(599)},
		},
	}

	svc.handleGeminiUpstreamError(context.Background(), account, http.StatusTooManyRequests, http.Header{}, []byte(`{"error":{"message":"rate limited"}}`))

	if repo.setRateLimitedCalls != 0 {
		t.Fatalf("expected no SetRateLimited calls when custom error code mismatches, got %d", repo.setRateLimitedCalls)
	}
}

func TestGeminiForwardNative_ErrorPolicySkippedReturns500AndNoRetry(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	reqBody := []byte(`{"contents":[{"role":"user","parts":[{"text":"hi"}]}]}`)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1beta/models/gemini-2.5-pro:generateContent", bytes.NewReader(reqBody))

	repo := &geminiRateLimitRepoSpy{}
	upstream := &geminiHTTPUpstreamStub{
		statusCode: http.StatusTooManyRequests,
		body:       `{"error":{"message":"rate limited"}}`,
		headers:    http.Header{"Content-Type": []string{"application/json"}},
	}
	cfg := &config.Config{}
	cfg.Security.URLAllowlist.Enabled = false

	svc := &GeminiMessagesCompatService{
		accountRepo:      repo,
		rateLimitService: &RateLimitService{accountRepo: repo, cfg: cfg},
		httpUpstream:     upstream,
		cfg:              cfg,
	}
	account := &Account{
		ID:          302,
		Name:        "gemini-skipped-policy",
		Platform:    PlatformGemini,
		Type:        AccountTypeAPIKey,
		Concurrency: 1,
		Credentials: map[string]any{
			"api_key":                    "test-key",
			"base_url":                   "https://generativelanguage.googleapis.com",
			"custom_error_codes_enabled": true,
			"custom_error_codes":         []any{float64(599)},
		},
	}

	result, err := svc.ForwardNative(context.Background(), c, account, "gemini-2.5-pro", "generateContent", false, reqBody)
	if err == nil {
		t.Fatalf("expected error from skipped policy path")
	}
	if result != nil {
		t.Fatalf("expected nil result on skipped policy path")
	}
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", rec.Code)
	}
	if upstream.calls != 1 {
		t.Fatalf("expected exactly 1 upstream call, got %d", upstream.calls)
	}
	if repo.setRateLimitedCalls != 0 {
		t.Fatalf("expected no SetRateLimited calls for skipped policy, got %d", repo.setRateLimitedCalls)
	}
}
