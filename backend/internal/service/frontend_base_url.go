package service

import (
	"fmt"
	"net"
	"net/url"
	"strings"

	"github.com/Wei-Shaw/sub2api/internal/config"
)

type FrontendBaseURLInput struct {
	Origin string // Origin header value (optional)
	Host   string // Request.Host (may include port)
	IsTLS  bool   // Whether request is over TLS
}

// TrustedFrontendBaseURL returns a frontend base URL suitable for generating security-sensitive links.
//
// Priority:
// 1) server.frontend_base_url (trusted config)
// 2) (debug-only) derive from request if server.dev_allow_derived_frontend_base_url=true AND host is allowlisted
func TrustedFrontendBaseURL(input FrontendBaseURLInput, cfg *config.Config) (string, error) {
	if cfg == nil {
		return "", fmt.Errorf("config is nil")
	}

	if base := strings.TrimSpace(cfg.Server.FrontendBaseURL); base != "" {
		trimmed := strings.TrimRight(base, "/")
		if err := config.ValidateAbsoluteHTTPURL(trimmed); err != nil {
			return "", fmt.Errorf("server.frontend_base_url invalid: %w", err)
		}
		return trimmed, nil
	}

	if !strings.EqualFold(strings.TrimSpace(cfg.Server.Mode), "debug") || !cfg.Server.DevAllowDerivedFrontendBaseURL {
		return "", fmt.Errorf("server.frontend_base_url is required (or enable debug-only derived mode)")
	}

	allowlist := normalizeHostAllowlist(cfg.Server.DevAllowedFrontendHosts)
	if len(allowlist) == 0 {
		return "", fmt.Errorf("server.dev_allowed_frontend_hosts is empty")
	}

	// Prefer Origin if present (common for browser-based admin).
	if origin := strings.TrimSpace(input.Origin); origin != "" {
		u, err := url.Parse(origin)
		if err != nil || !u.IsAbs() {
			return "", fmt.Errorf("invalid origin header")
		}
		if !isHTTPScheme(u.Scheme) {
			return "", fmt.Errorf("unsupported origin scheme: %s", u.Scheme)
		}
		host := strings.ToLower(strings.TrimSpace(u.Hostname()))
		if host == "" || !isAllowedHost(host, allowlist) {
			return "", fmt.Errorf("origin host is not allowlisted")
		}
		return fmt.Sprintf("%s://%s", strings.ToLower(u.Scheme), u.Host), nil
	}

	host := strings.TrimSpace(input.Host)
	if host == "" {
		return "", fmt.Errorf("missing request host")
	}
	hostName := host
	if h, _, err := net.SplitHostPort(host); err == nil && strings.TrimSpace(h) != "" {
		hostName = h
	}
	hostName = strings.ToLower(strings.TrimSpace(hostName))
	if hostName == "" || !isAllowedHost(hostName, allowlist) {
		return "", fmt.Errorf("request host is not allowlisted")
	}
	scheme := "http"
	if input.IsTLS {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s", scheme, host), nil
}

func normalizeHostAllowlist(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	out := make([]string, 0, len(values))
	for _, v := range values {
		entry := strings.ToLower(strings.TrimSpace(v))
		if entry == "" {
			continue
		}
		if host, _, err := net.SplitHostPort(entry); err == nil {
			entry = host
		}
		out = append(out, entry)
	}
	return out
}

func isAllowedHost(host string, allowlist []string) bool {
	for _, entry := range allowlist {
		if entry == "" {
			continue
		}
		if strings.HasPrefix(entry, "*.") {
			suffix := strings.TrimPrefix(entry, "*.")
			if host == suffix || strings.HasSuffix(host, "."+suffix) {
				return true
			}
			continue
		}
		if host == entry {
			return true
		}
	}
	return false
}

func isHTTPScheme(scheme string) bool {
	return strings.EqualFold(scheme, "http") || strings.EqualFold(scheme, "https")
}
