package service

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

type errorHTTPUpstream struct {
	err error
}

func (u errorHTTPUpstream) Do(req *http.Request, proxyURL string, accountID int64, accountConcurrency int) (*http.Response, error) {
	return nil, u.err
}

func (u errorHTTPUpstream) DoWithTLS(req *http.Request, proxyURL string, accountID int64, accountConcurrency int, enableTLSFingerprint bool) (*http.Response, error) {
	return nil, u.err
}

func parseOpenAIErrorMessage(t *testing.T, body []byte) string {
	t.Helper()
	var payload struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	return payload.Error.Message
}

func TestQwenGatewayService_UpstreamErrorDoesNotLeakDetailsToClient(t *testing.T) {
	gin.SetMode(gin.TestMode)

	upstreamErr := errors.New("proxyconnect tcp: dial tcp 192.0.2.1:8080: connect: connection refused?access_token=SECRET&refresh_token=SECRET")
	svc := NewQwenGatewayService(nil, errorHTTPUpstream{err: upstreamErr}, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"model":"test"}`))

	account := &Account{
		ID:       1,
		Name:     "qwen",
		Platform: PlatformQwen,
		Type:     AccountTypeAPIKey,
		Credentials: map[string]any{
			"api_key": "sk-test",
		},
	}

	_, _ = svc.ForwardChatCompletions(context.Background(), c, account, "test", false, []byte(`{"model":"test"}`))

	if w.Code != http.StatusBadGateway {
		t.Fatalf("expected status %d, got %d", http.StatusBadGateway, w.Code)
	}
	if msg := parseOpenAIErrorMessage(t, w.Body.Bytes()); msg != "Upstream request failed" {
		t.Fatalf("expected generic error message, got %q", msg)
	}

	body := w.Body.String()
	for _, leaked := range []string{"192.0.2.1", "access_token", "refresh_token", "proxyconnect", "dial tcp"} {
		if strings.Contains(body, leaked) {
			t.Fatalf("response leaked %q: %s", leaked, body)
		}
	}
}

func TestIFlowGatewayService_UpstreamErrorDoesNotLeakDetailsToClient(t *testing.T) {
	gin.SetMode(gin.TestMode)

	upstreamErr := errors.New("dial tcp 198.51.100.10:443: i/o timeout?key=SECRET")
	svc := NewIFlowGatewayService(errorHTTPUpstream{err: upstreamErr}, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1/chat/completions", strings.NewReader(`{"model":"test"}`))

	account := &Account{
		ID:       2,
		Name:     "iflow",
		Platform: PlatformIFlow,
		Type:     AccountTypeAPIKey,
		Credentials: map[string]any{
			"api_key": "sk-test",
		},
	}

	_, _ = svc.ForwardChatCompletions(context.Background(), c, account, "test", false, []byte(`{"model":"test"}`))

	if w.Code != http.StatusBadGateway {
		t.Fatalf("expected status %d, got %d", http.StatusBadGateway, w.Code)
	}
	if msg := parseOpenAIErrorMessage(t, w.Body.Bytes()); msg != "Upstream request failed" {
		t.Fatalf("expected generic error message, got %q", msg)
	}

	body := w.Body.String()
	for _, leaked := range []string{"198.51.100.10", "key=SECRET", "dial tcp"} {
		if strings.Contains(body, leaked) {
			t.Fatalf("response leaked %q: %s", leaked, body)
		}
	}
}

