package antigravity

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

type rewriteToServerTransport struct {
	serverURL string
}

func (t *rewriteToServerTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	newReq := req.Clone(req.Context())
	u := *req.URL

	target, err := http.NewRequestWithContext(req.Context(), req.Method, t.serverURL+u.Path, req.Body)
	if err != nil {
		return nil, err
	}
	target.Header = newReq.Header
	return http.DefaultTransport.RoundTrip(target)
}

func TestClient_ExchangeCode_TooLarge(t *testing.T) {
	t.Setenv(AntigravityOAuthClientSecretEnvVar, "test-client-secret")

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(bytes.Repeat([]byte("a"), int(maxGoogleOAuthBodyBytes)+1))
	}))
	defer srv.Close()

	c := &Client{httpClient: &http.Client{Transport: &rewriteToServerTransport{serverURL: srv.URL}}}
	_, err := c.ExchangeCode(context.Background(), "code", "verifier")
	require.Error(t, err)
	require.Contains(t, err.Error(), "too large")
}

func TestClient_LoadCodeAssist_TooLarge(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(bytes.Repeat([]byte("b"), int(maxAntigravityInternalBytes)+1))
	}))
	defer srv.Close()

	c := &Client{httpClient: &http.Client{Transport: &rewriteToServerTransport{serverURL: srv.URL}}}
	_, _, err := c.LoadCodeAssist(context.Background(), "at")
	require.Error(t, err)
	require.Contains(t, err.Error(), "too large")
}
