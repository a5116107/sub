package setup

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestSetupGuard_TokenAndLoopback(t *testing.T) {
	gin.SetMode(gin.TestMode)

	dataDir := t.TempDir()
	prevDataDir := os.Getenv("DATA_DIR")
	prevSetupToken := os.Getenv("SETUP_TOKEN")
	prevAltSetupToken := os.Getenv("SUB2API_SETUP_TOKEN")
	t.Cleanup(func() {
		_ = os.Setenv("DATA_DIR", prevDataDir)
		_ = os.Setenv("SETUP_TOKEN", prevSetupToken)
		_ = os.Setenv("SUB2API_SETUP_TOKEN", prevAltSetupToken)
	})

	require.NoError(t, os.Setenv("DATA_DIR", dataDir))
	require.NoError(t, os.Unsetenv("SETUP_TOKEN"))
	require.NoError(t, os.Unsetenv("SUB2API_SETUP_TOKEN"))

	router := gin.New()
	RegisterRoutes(router)

	t.Run("remote_without_token_rejected", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/setup/test-db", bytes.NewBufferString(`{}`))
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = "203.0.113.10:12345"
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		require.Equal(t, http.StatusUnauthorized, rec.Code)
	})

	t.Run("loopback_without_token_allowed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/setup/test-db", bytes.NewBufferString(`{}`))
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = "127.0.0.1:12345"
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		require.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("token_required_when_configured", func(t *testing.T) {
		require.NoError(t, os.Setenv("SETUP_TOKEN", "secret"))
		req := httptest.NewRequest(http.MethodPost, "/setup/test-db", bytes.NewBufferString(`{}`))
		req.Header.Set("Content-Type", "application/json")
		req.RemoteAddr = "203.0.113.10:12345"
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		require.Equal(t, http.StatusUnauthorized, rec.Code)
	})

	t.Run("token_allows_remote", func(t *testing.T) {
		require.NoError(t, os.Setenv("SETUP_TOKEN", "secret"))
		req := httptest.NewRequest(http.MethodPost, "/setup/test-db", bytes.NewBufferString(`{}`))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Setup-Token", "secret")
		req.RemoteAddr = "203.0.113.10:12345"
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		require.Equal(t, http.StatusBadRequest, rec.Code)
	})
}
