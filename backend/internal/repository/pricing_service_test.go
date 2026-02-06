package repository

import (
	"bytes"
	"context"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestPricingRemoteClient_FetchPricingJSON_TooLarge(t *testing.T) {
	srv := newLocalTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(bytes.Repeat([]byte("a"), int(maxPricingJSONBytes)+1))
	}))
	defer srv.Close()

	client := NewPricingRemoteClient("")
	_, err := client.FetchPricingJSON(context.Background(), srv.URL)
	require.Error(t, err)
	require.Contains(t, err.Error(), "too large")
}

func TestPricingRemoteClient_FetchHashText_TooLarge(t *testing.T) {
	srv := newLocalTestServer(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(bytes.Repeat([]byte("b"), int(maxPricingHashBytes)+1))
	}))
	defer srv.Close()

	client := NewPricingRemoteClient("")
	_, err := client.FetchHashText(context.Background(), srv.URL)
	require.Error(t, err)
	require.Contains(t, err.Error(), "too large")
}
