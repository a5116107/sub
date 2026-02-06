package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestIndexing_PrivateMode_NoIndexAndRobotsDisallowAll(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Security: config.SecurityConfig{
			Indexing: config.IndexingConfig{Mode: "private"},
		},
	}

	r := gin.New()
	r.Use(Indexing(cfg, nil))
	r.GET("/login", func(c *gin.Context) { c.String(http.StatusOK, "ok") })

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/login", nil))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "noindex, nofollow", w.Header().Get("X-Robots-Tag"))

	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/robots.txt", nil))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "Disallow: /")

	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/sitemap.xml", nil))
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestIndexing_PublicMode_RobotsAndSitemap(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Server: config.ServerConfig{
			FrontendBaseURL: "https://example.com",
		},
		Security: config.SecurityConfig{
			Indexing: config.IndexingConfig{Mode: "public"},
		},
	}

	r := gin.New()
	r.Use(Indexing(cfg, nil))
	r.GET("/", func(c *gin.Context) { c.String(http.StatusOK, "ok") })
	r.GET("/login", func(c *gin.Context) { c.String(http.StatusOK, "ok") })
	r.GET("/purchase-subscription", func(c *gin.Context) { c.String(http.StatusOK, "ok") })

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/", nil))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Empty(t, w.Header().Get("X-Robots-Tag"))

	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/login", nil))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "noindex, nofollow", w.Header().Get("X-Robots-Tag"))

	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/purchase-subscription", nil))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "noindex, nofollow", w.Header().Get("X-Robots-Tag"))

	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/robots.txt", nil))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "Sitemap: https://example.com/sitemap.xml")

	w = httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/sitemap.xml", nil))
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "<loc>https://example.com/</loc>")
	assert.Contains(t, w.Body.String(), "<loc>https://example.com/docs/overview</loc>")
}

func TestIndexing_PublicMode_MissingBaseURL_Sitemap404(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Security: config.SecurityConfig{
			Indexing: config.IndexingConfig{Mode: "public"},
		},
	}

	r := gin.New()
	r.Use(Indexing(cfg, nil))

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/sitemap.xml", nil))
	assert.Equal(t, http.StatusNotFound, w.Code)
}
