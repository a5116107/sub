package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

const (
	indexingModePrivate = "private"
	indexingModePublic  = "public"
)

// Indexing controls search engine indexing behavior and serves robots.txt / sitemap.xml.
//
// Recommended default:
// - security.indexing.mode=private
// And enable "public" only for official/public-facing deployments.
func Indexing(cfg *config.Config, settingService *service.SettingService) gin.HandlerFunc {
	mode := indexingModePrivate
	if cfg != nil {
		if v := strings.ToLower(strings.TrimSpace(cfg.Security.Indexing.Mode)); v != "" {
			mode = v
		}
	}

	return func(c *gin.Context) {
		switch c.Request.URL.Path {
		case "/robots.txt":
			serveRobotsTXT(c, cfg, mode)
			c.Abort()
			return
		case "/sitemap.xml":
			serveSitemapXML(c, cfg, mode, settingService)
			c.Abort()
			return
		}

		if shouldNoIndex(c.Request.URL.Path, mode) {
			c.Header("X-Robots-Tag", "noindex, nofollow")
		}

		c.Next()
	}
}

func shouldNoIndex(path string, mode string) bool {
	if strings.EqualFold(mode, indexingModePublic) {
		return isPublicNoIndexPath(path)
	}
	// Default: private mode (fail-safe).
	return true
}

func isPublicNoIndexPath(path string) bool {
	if path == "" {
		return true
	}
	if path == "/login" ||
		path == "/register" ||
		path == "/forgot-password" ||
		path == "/reset-password" ||
		path == "/email-verify" {
		return true
	}
	if hasPathPrefix(path, "/auth") {
		return true
	}
	if hasPathPrefix(path, "/setup") {
		return true
	}

	// Private UI areas (auth required) - keep noindex to avoid noise and reduce exposure.
	if hasPathPrefix(path, "/admin") ||
		path == "/dashboard" ||
		path == "/keys" ||
		path == "/usage" ||
		path == "/redeem" ||
		path == "/profile" ||
		path == "/subscriptions" ||
		path == "/purchase" ||
		path == "/purchase-subscription" ||
		path == "/billing" {
		return true
	}

	// API and operational endpoints are not useful to index.
	if hasPathPrefix(path, "/api") ||
		hasPathPrefix(path, "/v1") ||
		hasPathPrefix(path, "/v1beta") ||
		hasPathPrefix(path, "/antigravity") ||
		path == "/responses" ||
		path == "/health" {
		return true
	}

	return false
}

func hasPathPrefix(path string, prefix string) bool {
	if path == prefix {
		return true
	}
	return strings.HasPrefix(path, prefix+"/")
}

func serveRobotsTXT(c *gin.Context, cfg *config.Config, mode string) {
	c.Header("Content-Type", "text/plain; charset=utf-8")
	c.Header("Cache-Control", "public, max-age=300")

	if !strings.EqualFold(mode, indexingModePublic) {
		c.String(http.StatusOK, "User-agent: *\nDisallow: /\n")
		return
	}

	// Public mode: allow crawling public pages, but block private/auth/API paths.
	var b strings.Builder
	b.WriteString("User-agent: *\n")
	for _, disallow := range []string{
		"/admin/",
		"/dashboard",
		"/keys",
		"/usage",
		"/redeem",
		"/profile",
		"/subscriptions",
		"/purchase",
		"/purchase-subscription",
		"/billing",
		"/login",
		"/register",
		"/forgot-password",
		"/reset-password",
		"/email-verify",
		"/auth/",
		"/setup/",
		"/api/",
		"/v1/",
		"/v1beta/",
		"/antigravity/",
		"/responses",
	} {
		b.WriteString("Disallow: ")
		b.WriteString(disallow)
		b.WriteString("\n")
	}
	if base, err := trustedFrontendBaseURL(cfg, c); err == nil && base != "" {
		b.WriteString("Sitemap: ")
		b.WriteString(base)
		b.WriteString("/sitemap.xml\n")
	}
	c.String(http.StatusOK, b.String())
}

func serveSitemapXML(c *gin.Context, cfg *config.Config, mode string, settingService *service.SettingService) {
	// In private mode, we intentionally don't expose a sitemap.
	if !strings.EqualFold(mode, indexingModePublic) {
		c.Status(http.StatusNotFound)
		return
	}

	base, err := trustedFrontendBaseURL(cfg, c)
	if err != nil || base == "" {
		// Domain not configured yet (or not derivable in a trusted way).
		c.Status(http.StatusNotFound)
		return
	}

	// Phase-1: list public docs routes (SPA now; can be upgraded to SSG later without changing URLs).
	lastmod := time.Now().UTC().Format("2006-01-02")

	type entry struct {
		Path       string
		Changefreq string
		Priority   string
	}
	entries := []entry{
		{Path: "/", Changefreq: "weekly", Priority: "1.0"},
	}

	// Default docs list (fallback if DB not available).
	docsKeys := []string{"overview", "quickstart", "compatibility", "faq"}
	if settingService != nil {
		if pages, err := settingService.ListPublicDocsPages(c.Request.Context()); err == nil && len(pages) > 0 {
			docsKeys = make([]string, 0, len(pages))
			for _, p := range pages {
				if strings.TrimSpace(p.Key) == "" {
					continue
				}
				docsKeys = append(docsKeys, p.Key)
			}
		}
	}

	for i, key := range docsKeys {
		priority := "0.6"
		if i == 0 {
			priority = "0.8"
		}
		entries = append(entries, entry{
			Path:       "/docs/" + key,
			Changefreq: "monthly",
			Priority:   priority,
		})
	}

	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	b.WriteString(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` + "\n")
	for _, e := range entries {
		b.WriteString("  <url>\n")
		b.WriteString(fmt.Sprintf("    <loc>%s%s</loc>\n", base, e.Path))
		b.WriteString(fmt.Sprintf("    <lastmod>%s</lastmod>\n", lastmod))
		b.WriteString(fmt.Sprintf("    <changefreq>%s</changefreq>\n", e.Changefreq))
		b.WriteString(fmt.Sprintf("    <priority>%s</priority>\n", e.Priority))
		b.WriteString("  </url>\n")
	}
	b.WriteString(`</urlset>` + "\n")
	xml := b.String()

	c.Header("Content-Type", "application/xml; charset=utf-8")
	c.Header("Cache-Control", "public, max-age=300")
	c.String(http.StatusOK, xml)
}

func trustedFrontendBaseURL(cfg *config.Config, c *gin.Context) (string, error) {
	if cfg == nil || c == nil {
		return "", fmt.Errorf("missing config or context")
	}
	return service.TrustedFrontendBaseURL(service.FrontendBaseURLInput{
		Origin: c.GetHeader("Origin"),
		Host:   c.Request.Host,
		IsTLS:  c.Request.TLS != nil,
	}, cfg)
}
