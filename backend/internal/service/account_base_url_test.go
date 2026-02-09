package service

import "testing"

func TestAccount_GetGeminiBaseURL(t *testing.T) {
	tests := []struct {
		name        string
		account     Account
		defaultURL  string
		expectedURL string
	}{
		{
			name: "fallback to default for empty base_url",
			account: Account{
				Type:        AccountTypeAPIKey,
				Platform:    PlatformGemini,
				Credentials: map[string]any{},
			},
			defaultURL:  "https://generativelanguage.googleapis.com",
			expectedURL: "https://generativelanguage.googleapis.com",
		},
		{
			name: "keep custom base_url for non-antigravity",
			account: Account{
				Type:        AccountTypeAPIKey,
				Platform:    PlatformGemini,
				Credentials: map[string]any{"base_url": "https://custom.example.com"},
			},
			defaultURL:  "https://generativelanguage.googleapis.com",
			expectedURL: "https://custom.example.com",
		},
		{
			name: "append antigravity suffix for apikey",
			account: Account{
				Type:        AccountTypeAPIKey,
				Platform:    PlatformAntigravity,
				Credentials: map[string]any{"base_url": "https://up.example.com"},
			},
			defaultURL:  "https://generativelanguage.googleapis.com",
			expectedURL: "https://up.example.com/antigravity",
		},
		{
			name: "do not duplicate antigravity suffix",
			account: Account{
				Type:        AccountTypeAPIKey,
				Platform:    PlatformAntigravity,
				Credentials: map[string]any{"base_url": "https://up.example.com/antigravity/"},
			},
			defaultURL:  "https://generativelanguage.googleapis.com",
			expectedURL: "https://up.example.com/antigravity",
		},
		{
			name: "oauth account does not auto append suffix",
			account: Account{
				Type:        AccountTypeOAuth,
				Platform:    PlatformAntigravity,
				Credentials: map[string]any{"base_url": "https://up.example.com"},
			},
			defaultURL:  "https://generativelanguage.googleapis.com",
			expectedURL: "https://up.example.com",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := tc.account.GetGeminiBaseURL(tc.defaultURL)
			if got != tc.expectedURL {
				t.Fatalf("GetGeminiBaseURL() = %q, want %q", got, tc.expectedURL)
			}
		})
	}
}

func TestAccount_GetBaseURL(t *testing.T) {
	tests := []struct {
		name        string
		account     Account
		expectedURL string
	}{
		{
			name: "non apikey returns empty",
			account: Account{
				Type:        AccountTypeOAuth,
				Platform:    PlatformAntigravity,
				Credentials: map[string]any{"base_url": "https://up.example.com"},
			},
			expectedURL: "",
		},
		{
			name: "empty base_url falls back to anthropic default",
			account: Account{
				Type:        AccountTypeAPIKey,
				Platform:    PlatformAnthropic,
				Credentials: map[string]any{},
			},
			expectedURL: "https://api.anthropic.com",
		},
		{
			name: "antigravity apikey appends suffix",
			account: Account{
				Type:        AccountTypeAPIKey,
				Platform:    PlatformAntigravity,
				Credentials: map[string]any{"base_url": "https://up.example.com"},
			},
			expectedURL: "https://up.example.com/antigravity",
		},
		{
			name: "antigravity suffix is idempotent",
			account: Account{
				Type:        AccountTypeAPIKey,
				Platform:    PlatformAntigravity,
				Credentials: map[string]any{"base_url": "https://up.example.com/antigravity/"},
			},
			expectedURL: "https://up.example.com/antigravity",
		},
		{
			name: "non antigravity keeps custom base_url",
			account: Account{
				Type:        AccountTypeAPIKey,
				Platform:    PlatformAnthropic,
				Credentials: map[string]any{"base_url": "https://custom.example.com"},
			},
			expectedURL: "https://custom.example.com",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := tc.account.GetBaseURL()
			if got != tc.expectedURL {
				t.Fatalf("GetBaseURL() = %q, want %q", got, tc.expectedURL)
			}
		})
	}
}
