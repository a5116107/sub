package service

import (
	"context"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
)

type usageLogRepoForceCacheSpy struct {
	UsageLogRepository

	created *UsageLog
}

func (s *usageLogRepoForceCacheSpy) Create(_ context.Context, usageLog *UsageLog) (bool, error) {
	if usageLog != nil {
		copyLog := *usageLog
		s.created = &copyLog
		usageLog.ID = 1
	}
	return true, nil
}

func (s *usageLogRepoForceCacheSpy) CreateBillingUsageEntry(_ context.Context, entry *BillingUsageEntry) (bool, error) {
	if entry != nil {
		entry.Applied = true
		entry.ID = 1
	}
	return false, nil
}

func (s *usageLogRepoForceCacheSpy) MarkBillingUsageEntryApplied(context.Context, int64) error {
	return nil
}

func TestGatewayService_RecordUsage_ForceCacheBillingConvertsInputTokens(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{
		Pricing: config.PricingConfig{MissingPolicy: "fallback_claude_only"},
		Default: config.DefaultConfig{RateMultiplier: 1.0},
	}

	repo := &usageLogRepoForceCacheSpy{}
	svc := &GatewayService{
		usageLogRepo:    repo,
		cfg:             cfg,
		billingService:  NewBillingService(cfg, nil),
		deferredService: &DeferredService{},
	}

	err := svc.RecordUsage(context.Background(), &RecordUsageInput{
		Result: &ForwardResult{
			RequestID: "req-force-cache",
			Model:     "claude-3-5-sonnet-20241022",
			Usage: ClaudeUsage{
				InputTokens:          120,
				OutputTokens:         20,
				CacheReadInputTokens: 30,
			},
			Duration: 10 * time.Millisecond,
		},
		APIKey: &APIKey{ID: 1},
		User:   &User{ID: 2},
		Account: &Account{
			ID: 3,
		},
		ForceCacheBilling: true,
	})
	if err != nil {
		t.Fatalf("RecordUsage error: %v", err)
	}

	if repo.created == nil {
		t.Fatalf("expected usage log to be created")
	}
	if repo.created.InputTokens != 0 {
		t.Fatalf("expected input_tokens converted to 0, got %d", repo.created.InputTokens)
	}
	if repo.created.CacheReadTokens != 150 {
		t.Fatalf("expected cache_read_tokens=150, got %d", repo.created.CacheReadTokens)
	}
}

func TestGatewayService_RecordUsage_WithoutForceCacheBillingKeepsTokens(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{
		Pricing: config.PricingConfig{MissingPolicy: "fallback_claude_only"},
		Default: config.DefaultConfig{RateMultiplier: 1.0},
	}

	repo := &usageLogRepoForceCacheSpy{}
	svc := &GatewayService{
		usageLogRepo:    repo,
		cfg:             cfg,
		billingService:  NewBillingService(cfg, nil),
		deferredService: &DeferredService{},
	}

	err := svc.RecordUsage(context.Background(), &RecordUsageInput{
		Result: &ForwardResult{
			RequestID: "req-no-force-cache",
			Model:     "claude-3-5-sonnet-20241022",
			Usage: ClaudeUsage{
				InputTokens:          120,
				OutputTokens:         20,
				CacheReadInputTokens: 30,
			},
			Duration: 10 * time.Millisecond,
		},
		APIKey: &APIKey{ID: 1},
		User:   &User{ID: 2},
		Account: &Account{
			ID: 3,
		},
		ForceCacheBilling: false,
	})
	if err != nil {
		t.Fatalf("RecordUsage error: %v", err)
	}

	if repo.created == nil {
		t.Fatalf("expected usage log to be created")
	}
	if repo.created.InputTokens != 120 {
		t.Fatalf("expected input_tokens unchanged, got %d", repo.created.InputTokens)
	}
	if repo.created.CacheReadTokens != 30 {
		t.Fatalf("expected cache_read_tokens unchanged=30, got %d", repo.created.CacheReadTokens)
	}
}
