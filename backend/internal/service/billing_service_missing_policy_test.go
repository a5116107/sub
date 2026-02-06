package service

import (
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
)

func TestBillingService_MissingPricingPolicy(t *testing.T) {
	t.Run("default_policy_rejects_unknown_non_claude", func(t *testing.T) {
		cfg := &config.Config{}
		cfg.Pricing.MissingPolicy = ""
		svc := NewBillingService(cfg, nil)

		if _, err := svc.GetModelPricing("gpt-unknown"); err == nil {
			t.Fatalf("expected error for missing pricing with default policy")
		}
		// Claude-family still falls back.
		if _, err := svc.GetModelPricing("claude-3-opus"); err != nil {
			t.Fatalf("expected claude fallback, got err=%v", err)
		}
	})

	t.Run("fallback_any_allows_unknown_model", func(t *testing.T) {
		cfg := &config.Config{}
		cfg.Pricing.MissingPolicy = "fallback_any"
		svc := NewBillingService(cfg, nil)

		// Unknown non-Claude model should still get fallback pricing under legacy policy.
		if _, err := svc.GetModelPricing("gpt-unknown"); err != nil {
			t.Fatalf("expected fallback pricing, got err=%v", err)
		}
	})

	t.Run("fallback_claude_only_rejects_unknown_non_claude", func(t *testing.T) {
		cfg := &config.Config{}
		cfg.Pricing.MissingPolicy = "fallback_claude_only"
		svc := NewBillingService(cfg, nil)

		if _, err := svc.GetModelPricing("gpt-unknown"); err == nil {
			t.Fatalf("expected error for missing pricing with fallback_claude_only")
		}
		// Claude-family still falls back.
		if _, err := svc.GetModelPricing("claude-3-opus"); err != nil {
			t.Fatalf("expected claude fallback, got err=%v", err)
		}
	})

	t.Run("fail_close_rejects_all_unknown_models", func(t *testing.T) {
		cfg := &config.Config{}
		cfg.Pricing.MissingPolicy = "fail_close"
		svc := NewBillingService(cfg, nil)

		if _, err := svc.GetModelPricing("gpt-unknown"); err == nil {
			t.Fatalf("expected error for missing pricing with fail_close")
		}
	})
}
