package urlvalidator

import "testing"

func TestValidateHTTPSURL_PortPolicy(t *testing.T) {
	_, err := ValidateHTTPSURL("https://example.com:8443", ValidationOptions{
		AllowedHosts:     []string{"example.com"},
		RequireAllowlist: true,
		AllowPrivate:     false,
		AllowPorts:       []int{443},
	})
	if err == nil {
		t.Fatalf("expected non-443 port to be rejected")
	}

	normalized, err := ValidateHTTPSURL("https://example.com:443", ValidationOptions{
		AllowedHosts:     []string{"example.com"},
		RequireAllowlist: true,
		AllowPrivate:     false,
		AllowPorts:       []int{443},
	})
	if err != nil {
		t.Fatalf("expected :443 to be allowed, got %v", err)
	}
	if normalized != "https://example.com:443" {
		t.Fatalf("expected normalized url to preserve :443, got %q", normalized)
	}
}

func TestValidateHTTPSURL_RequireNoPath(t *testing.T) {
	if _, err := ValidateHTTPSURL("https://example.com/api", ValidationOptions{
		AllowedHosts:     []string{"example.com"},
		RequireAllowlist: true,
		AllowPrivate:     false,
		AllowPorts:       []int{443},
		RequireNoPath:    true,
	}); err == nil {
		t.Fatalf("expected path to be rejected when RequireNoPath is true")
	}

	normalized, err := ValidateHTTPSURL("https://example.com/", ValidationOptions{
		AllowedHosts:     []string{"example.com"},
		RequireAllowlist: true,
		AllowPrivate:     false,
		AllowPorts:       []int{443},
		RequireNoPath:    true,
	})
	if err != nil {
		t.Fatalf("expected root path to be allowed, got %v", err)
	}
	if normalized != "https://example.com" {
		t.Fatalf("expected trailing slash trimmed, got %q", normalized)
	}
}

