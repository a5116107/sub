//go:build unit

package service

import (
	"context"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

type billingCacheFinalizeSpy struct {
	BillingCache

	calls []finalizeCall
}

type finalizeCall struct {
	userID      int64
	groupID     int64
	reservedUSD float64
	actualUSD   float64
}

func (s *billingCacheFinalizeSpy) FinalizeSubscriptionUsage(_ context.Context, userID, groupID int64, reservedUSD, actualUSD float64) error {
	s.calls = append(s.calls, finalizeCall{
		userID:      userID,
		groupID:     groupID,
		reservedUSD: reservedUSD,
		actualUSD:   actualUSD,
	})
	return nil
}

func TestGatewayService_FinalizeReservation_BindsToUsageLogID(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{RunMode: config.RunModeStandard}
	cfg.Default.RateMultiplier = 1.0
	cfg.Pricing.MissingPolicy = "fail_close"

	pricing := &PricingService{
		pricingData: map[string]*LiteLLMModelPricing{
			"model": {InputCostPerToken: 1e-6, OutputCostPerToken: 2e-6},
		},
	}
	billing := NewBillingService(cfg, pricing)

	cacheSpy := &billingCacheFinalizeSpy{}
	cacheSvc := &BillingCacheService{cache: cacheSpy, cfg: cfg}

	repo := &usageLogRepoBillingSpy{}
	svc := &GatewayService{
		cfg:                 cfg,
		billingService:      billing,
		usageLogRepo:        repo,
		billingCacheService: cacheSvc,
		deferredService:     &DeferredService{},
	}

	groupID := int64(10)
	group := &Group{ID: groupID, SubscriptionType: SubscriptionTypeSubscription, RateMultiplier: 1.0}
	user := &User{ID: 1, Status: StatusActive, Role: RoleUser}
	apiKey := &APIKey{ID: 2, UserID: user.ID, Status: StatusActive, User: user, GroupID: &groupID, Group: group}
	account := &Account{ID: 3, Status: StatusActive}
	sub := &UserSubscription{ID: 7}

	result := &ForwardResult{
		RequestID: "rid",
		Model:     "model",
		Usage: ClaudeUsage{
			InputTokens:  100,
			OutputTokens: 10,
		},
	}

	input := &RecordUsageInput{
		Result:            result,
		APIKey:            apiKey,
		User:              user,
		Account:           account,
		Subscription:      sub,
		ReservedUSD:       0.5,
		ReservedUsageLogID: 999, // mismatched on purpose
	}
	require.NoError(t, svc.RecordUsage(context.Background(), input))

	// UsageLogID should be set by RecordUsage
	require.Equal(t, int64(100), result.UsageLogID)

	// Mismatched binding must prevent finalization call.
	require.Len(t, cacheSpy.calls, 0)
}

func TestOpenAIGatewayService_FinalizeReservation_BindsToUsageLogID(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{RunMode: config.RunModeStandard}
	cfg.Default.RateMultiplier = 1.0
	cfg.Pricing.MissingPolicy = "fail_close"

	pricing := &PricingService{
		pricingData: map[string]*LiteLLMModelPricing{
			"model": {InputCostPerToken: 1e-6, OutputCostPerToken: 2e-6},
		},
	}
	billing := NewBillingService(cfg, pricing)

	cacheSpy := &billingCacheFinalizeSpy{}
	cacheSvc := &BillingCacheService{cache: cacheSpy, cfg: cfg}

	repo := &usageLogRepoBillingSpy{}
	svc := &OpenAIGatewayService{
		cfg:                 cfg,
		billingService:      billing,
		usageLogRepo:        repo,
		billingCacheService: cacheSvc,
		deferredService:     &DeferredService{},
	}

	groupID := int64(10)
	group := &Group{ID: groupID, SubscriptionType: SubscriptionTypeSubscription, RateMultiplier: 1.0}
	user := &User{ID: 1, Status: StatusActive, Role: RoleUser}
	apiKey := &APIKey{ID: 2, UserID: user.ID, Status: StatusActive, User: user, GroupID: &groupID, Group: group}
	account := &Account{ID: 3, Status: StatusActive}
	sub := &UserSubscription{ID: 7}

	result := &OpenAIForwardResult{
		RequestID: "rid",
		Model:     "model",
		Usage: OpenAIUsage{
			InputTokens:  100,
			OutputTokens: 10,
		},
	}

	input := &OpenAIRecordUsageInput{
		Result:            result,
		APIKey:            apiKey,
		User:              user,
		Account:           account,
		Subscription:      sub,
		ReservedUSD:       0.5,
		ReservedUsageLogID: 999, // mismatched on purpose
	}
	require.NoError(t, svc.RecordUsage(context.Background(), input))

	require.Equal(t, int64(100), result.UsageLogID)
	require.Len(t, cacheSpy.calls, 0)
}

