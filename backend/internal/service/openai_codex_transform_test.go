package service

import "testing"

func TestNormalizeCodexModel_GPT53CodeAlias(t *testing.T) {
	ConfigureCodexModelAliases(nil)
	t.Cleanup(func() { ConfigureCodexModelAliases(nil) })

	got := normalizeCodexModel("gpt-5.3-code")
	if got != "gpt-5.3-codex" {
		t.Fatalf("expected gpt-5.3-codex, got %s", got)
	}
}

func TestNormalizeCodexModel_ReasoningSuffix(t *testing.T) {
	ConfigureCodexModelAliases(nil)
	t.Cleanup(func() { ConfigureCodexModelAliases(nil) })

	got := normalizeCodexModel("gpt-5.3-code-xhigh")
	if got != "gpt-5.3-codex" {
		t.Fatalf("expected gpt-5.3-codex for gpt-5.3-code-xhigh, got %s", got)
	}
}

func TestNormalizeCodexModel_ConfiguredAliasOverridesBuiltin(t *testing.T) {
	ConfigureCodexModelAliases(map[string]string{
		"gpt-5.3-code": "gpt-5.2-codex",
		"gpt-5.4-code": "gpt-5.2-codex",
	})
	t.Cleanup(func() { ConfigureCodexModelAliases(nil) })

	if got := normalizeCodexModel("gpt-5.3-code"); got != "gpt-5.2-codex" {
		t.Fatalf("expected configured alias gpt-5.2-codex, got %s", got)
	}
	if got := normalizeCodexModel("GPT-5.4-CODE"); got != "gpt-5.2-codex" {
		t.Fatalf("expected configured alias gpt-5.2-codex for case-insensitive key, got %s", got)
	}
}

func TestNormalizeCodexModel_PreserveFutureGPT5Family(t *testing.T) {
	ConfigureCodexModelAliases(nil)
	t.Cleanup(func() { ConfigureCodexModelAliases(nil) })

	got := normalizeCodexModel("gpt-5.9-codex-xhigh")
	if got != "gpt-5.9-codex" {
		t.Fatalf("expected gpt-5.9-codex, got %s", got)
	}
}

func TestNormalizeCodexModel_PreserveUnknownNonGPTModel(t *testing.T) {
	ConfigureCodexModelAliases(nil)
	t.Cleanup(func() { ConfigureCodexModelAliases(nil) })

	got := normalizeCodexModel("my-custom-model")
	if got != "my-custom-model" {
		t.Fatalf("expected my-custom-model, got %s", got)
	}
}
