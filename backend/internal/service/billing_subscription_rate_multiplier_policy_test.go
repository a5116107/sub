package service

import (
	"context"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

type usageLogRepoBillingSpy struct {
	UsageLogRepository

	created *UsageLog
	entry   *BillingUsageEntry

	appliedIDs []int64
}

func (s *usageLogRepoBillingSpy) Create(_ context.Context, log *UsageLog) (bool, error) {
	log.ID = 100
	s.created = log
	return true, nil
}

func (s *usageLogRepoBillingSpy) CreateBillingUsageEntry(_ context.Context, entry *BillingUsageEntry) (bool, error) {
	entry.ID = 200
	s.entry = entry
	return true, nil
}

func (s *usageLogRepoBillingSpy) MarkBillingUsageEntryApplied(_ context.Context, id int64) error {
	s.appliedIDs = append(s.appliedIDs, id)
	return nil
}

type userSubRepoIncrementSpy struct {
	UserSubscriptionRepository

	lastID   int64
	lastCost float64
}

func (s *userSubRepoIncrementSpy) IncrementUsage(_ context.Context, id int64, costUSD float64) error {
	s.lastID = id
	s.lastCost = costUSD
	return nil
}

func TestGatewayService_SubscriptionRateMultiplierPolicy_AppliesToUsageWhenEnabled(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{RunMode: config.RunModeStandard}
	cfg.Default.RateMultiplier = 1.0
	cfg.Pricing.MissingPolicy = "fail_close"
	cfg.Billing.SubscriptionRateMultiplierPolicy = "apply"

	pricing := &PricingService{
		pricingData: map[string]*LiteLLMModelPricing{
			"model": {InputCostPerToken: 1e-6, OutputCostPerToken: 2e-6},
		},
	}
	billing := NewBillingService(cfg, pricing)

	repo := &usageLogRepoBillingSpy{}
	userSubRepo := &userSubRepoIncrementSpy{}
	svc := &GatewayService{
		cfg:                 cfg,
		billingService:      billing,
		usageLogRepo:        repo,
		userSubRepo:         userSubRepo,
		billingCacheService: &BillingCacheService{},
		deferredService:     &DeferredService{},
	}

	groupID := int64(10)
	group := &Group{ID: groupID, SubscriptionType: SubscriptionTypeSubscription, RateMultiplier: 2.0}
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

	require.NoError(t, svc.RecordUsage(context.Background(), &RecordUsageInput{
		Result:       result,
		APIKey:       apiKey,
		User:         user,
		Account:      account,
		Subscription: sub,
	}))

	require.NotNil(t, repo.created)
	require.NotNil(t, repo.entry)
	require.Equal(t, int64(7), userSubRepo.lastID)
	require.InEpsilon(t, repo.created.ActualCost, repo.entry.DeltaUSD, 0.000001)
	require.InEpsilon(t, repo.created.ActualCost, userSubRepo.lastCost, 0.000001)
}

func TestGatewayService_SubscriptionRateMultiplierPolicy_IgnoresUsageWhenConfigured(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{RunMode: config.RunModeStandard}
	cfg.Default.RateMultiplier = 1.0
	cfg.Pricing.MissingPolicy = "fail_close"
	cfg.Billing.SubscriptionRateMultiplierPolicy = "ignore"

	pricing := &PricingService{
		pricingData: map[string]*LiteLLMModelPricing{
			"model": {InputCostPerToken: 1e-6, OutputCostPerToken: 2e-6},
		},
	}
	billing := NewBillingService(cfg, pricing)

	repo := &usageLogRepoBillingSpy{}
	userSubRepo := &userSubRepoIncrementSpy{}
	svc := &GatewayService{
		cfg:                 cfg,
		billingService:      billing,
		usageLogRepo:        repo,
		userSubRepo:         userSubRepo,
		billingCacheService: &BillingCacheService{},
		deferredService:     &DeferredService{},
	}

	groupID := int64(10)
	group := &Group{ID: groupID, SubscriptionType: SubscriptionTypeSubscription, RateMultiplier: 2.0}
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

	require.NoError(t, svc.RecordUsage(context.Background(), &RecordUsageInput{
		Result:       result,
		APIKey:       apiKey,
		User:         user,
		Account:      account,
		Subscription: sub,
	}))

	require.NotNil(t, repo.created)
	require.NotNil(t, repo.entry)
	require.Equal(t, int64(7), userSubRepo.lastID)
	require.InEpsilon(t, repo.created.TotalCost, repo.entry.DeltaUSD, 0.000001)
	require.InEpsilon(t, repo.created.TotalCost, userSubRepo.lastCost, 0.000001)
}

func TestOpenAIGatewayService_SubscriptionRateMultiplierPolicy_AppliesToUsageWhenEnabled(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{RunMode: config.RunModeStandard}
	cfg.Default.RateMultiplier = 1.0
	cfg.Pricing.MissingPolicy = "fail_close"
	cfg.Billing.SubscriptionRateMultiplierPolicy = "apply"

	pricing := &PricingService{
		pricingData: map[string]*LiteLLMModelPricing{
			"model": {InputCostPerToken: 1e-6, OutputCostPerToken: 2e-6},
		},
	}
	billing := NewBillingService(cfg, pricing)

	repo := &usageLogRepoBillingSpy{}
	userSubRepo := &userSubRepoIncrementSpy{}
	svc := &OpenAIGatewayService{
		cfg:                 cfg,
		billingService:      billing,
		usageLogRepo:        repo,
		userSubRepo:         userSubRepo,
		billingCacheService: &BillingCacheService{},
		deferredService:     &DeferredService{},
	}

	groupID := int64(10)
	group := &Group{ID: groupID, SubscriptionType: SubscriptionTypeSubscription, RateMultiplier: 2.0}
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

	require.NoError(t, svc.RecordUsage(context.Background(), &OpenAIRecordUsageInput{
		Result:       result,
		APIKey:       apiKey,
		User:         user,
		Account:      account,
		Subscription: sub,
	}))

	require.NotNil(t, repo.created)
	require.NotNil(t, repo.entry)
	require.Equal(t, int64(7), userSubRepo.lastID)
	require.InEpsilon(t, repo.created.ActualCost, repo.entry.DeltaUSD, 0.000001)
	require.InEpsilon(t, repo.created.ActualCost, userSubRepo.lastCost, 0.000001)
}

func TestOpenAIGatewayService_SubscriptionRateMultiplierPolicy_IgnoresUsageWhenConfigured(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{RunMode: config.RunModeStandard}
	cfg.Default.RateMultiplier = 1.0
	cfg.Pricing.MissingPolicy = "fail_close"
	cfg.Billing.SubscriptionRateMultiplierPolicy = "ignore"

	pricing := &PricingService{
		pricingData: map[string]*LiteLLMModelPricing{
			"model": {InputCostPerToken: 1e-6, OutputCostPerToken: 2e-6},
		},
	}
	billing := NewBillingService(cfg, pricing)

	repo := &usageLogRepoBillingSpy{}
	userSubRepo := &userSubRepoIncrementSpy{}
	svc := &OpenAIGatewayService{
		cfg:                 cfg,
		billingService:      billing,
		usageLogRepo:        repo,
		userSubRepo:         userSubRepo,
		billingCacheService: &BillingCacheService{},
		deferredService:     &DeferredService{},
	}

	groupID := int64(10)
	group := &Group{ID: groupID, SubscriptionType: SubscriptionTypeSubscription, RateMultiplier: 2.0}
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

	require.NoError(t, svc.RecordUsage(context.Background(), &OpenAIRecordUsageInput{
		Result:       result,
		APIKey:       apiKey,
		User:         user,
		Account:      account,
		Subscription: sub,
	}))

	require.NotNil(t, repo.created)
	require.NotNil(t, repo.entry)
	require.Equal(t, int64(7), userSubRepo.lastID)
	require.InEpsilon(t, repo.created.TotalCost, repo.entry.DeltaUSD, 0.000001)
	require.InEpsilon(t, repo.created.TotalCost, userSubRepo.lastCost, 0.000001)
}
