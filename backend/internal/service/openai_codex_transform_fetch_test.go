package service

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestFetchWithETag_RejectsOversizedResponse(t *testing.T) {
	t.Parallel()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		_, _ = io.WriteString(w, strings.Repeat("a", opencodeFetchMaxBytes+1))
	}))
	defer srv.Close()

	_, _, _, err := fetchWithETag(srv.URL, "")
	if err == nil {
		t.Fatalf("expected error for oversized response")
	}
}

