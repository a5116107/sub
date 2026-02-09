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
