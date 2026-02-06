package service

import "testing"

func TestIsSensitiveKey_WhitelistTokenCounters(t *testing.T) {
	allowed := []string{
		"max_tokens",
		"max_completion_tokens",
		"max_output_tokens",
		"completion_tokens",
		"prompt_tokens",
		"total_tokens",
		"input_tokens",
		"output_tokens",
		"cache_creation_input_tokens",
		"cache_read_input_tokens",
	}

	for _, key := range allowed {
		if isSensitiveKey(key) {
			t.Fatalf("expected key %q to be treated as non-sensitive", key)
		}
	}
}

func TestIsSensitiveKey_StillMasksActualSecrets(t *testing.T) {
	secrets := []string{"access_token", "authorization", "client_secret", "jwt_signature"}
	for _, key := range secrets {
		if !isSensitiveKey(key) {
			t.Fatalf("expected key %q to be treated as sensitive", key)
		}
	}
}
