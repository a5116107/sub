package ip

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGetClientIP_IgnoresForwardedHeadersWhenProxiesUntrusted(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	require.NoError(t, router.SetTrustedProxies(nil))

	router.GET("/", func(c *gin.Context) {
		c.String(http.StatusOK, GetClientIP(c))
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "198.51.100.20:4321"
	req.Header.Set("CF-Connecting-IP", "203.0.113.8")
	req.Header.Set("X-Real-IP", "203.0.113.7")
	req.Header.Set("X-Forwarded-For", "203.0.113.6, 198.51.100.20")

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	require.Equal(t, "198.51.100.20", strings.TrimSpace(rec.Body.String()))
}

func TestGetClientIP_UsesForwardedHeadersFromTrustedProxy(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	require.NoError(t, router.SetTrustedProxies([]string{"198.51.100.0/24"}))

	router.GET("/", func(c *gin.Context) {
		c.String(http.StatusOK, GetClientIP(c))
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "198.51.100.20:4321"
	req.Header.Set("X-Forwarded-For", "203.0.113.6, 198.51.100.20")

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	require.Equal(t, "203.0.113.6", strings.TrimSpace(rec.Body.String()))
}
