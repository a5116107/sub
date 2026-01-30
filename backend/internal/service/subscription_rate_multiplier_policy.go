package service

import (
	"strings"

	"github.com/Wei-Shaw/sub2api/internal/config"
)

func applyRateMultiplierToSubscription(cfg *config.Config) bool {
	policy := "apply"
	if cfg != nil && strings.TrimSpace(cfg.Billing.SubscriptionRateMultiplierPolicy) != "" {
		policy = cfg.Billing.SubscriptionRateMultiplierPolicy
	}
	switch strings.ToLower(strings.TrimSpace(policy)) {
	case "apply":
		return true
	case "ignore":
		return false
	default:
		// Be safe and consistent with balance billing by default.
		return true
	}
}
