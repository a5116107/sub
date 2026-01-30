package service

import (
	"context"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/pkg/ctxkey"
)

type usageLogRepoRequestIDSpy struct {
	UsageLogRepository

	requestID string
}

func (s *usageLogRepoRequestIDSpy) Create(_ context.Context, log *UsageLog) (bool, error) {
	if log != nil {
		s.requestID = log.RequestID
		log.ID = 1
	}
	return true, nil
}

func (s *usageLogRepoRequestIDSpy) CreateBillingUsageEntry(_ context.Context, entry *BillingUsageEntry) (bool, error) {
	if entry != nil {
		// Skip billing apply path to keep the test focused.
		entry.Applied = true
		entry.ID = 1
	}
	return false, nil
}

func (s *usageLogRepoRequestIDSpy) MarkBillingUsageEntryApplied(context.Context, int64) error {
	return nil
}

func TestGatewayService_RecordUsage_PrefersClientProvidedRequestID(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{
		Pricing: config.PricingConfig{MissingPolicy: "fallback_claude_only"},
		Default: config.DefaultConfig{RateMultiplier: 1.0},
	}

	usageRepo := &usageLogRepoRequestIDSpy{}
	svc := &GatewayService{
		usageLogRepo:    usageRepo,
		cfg:             cfg,
		billingService:  NewBillingService(cfg, nil),
		deferredService: &DeferredService{},
	}

	ctx := context.WithValue(context.Background(), ctxkey.ClientRequestID, "client-req-123")
	ctx = context.WithValue(ctx, ctxkey.ClientRequestIDProvided, true)

	err := svc.RecordUsage(ctx, &RecordUsageInput{
		Result: &ForwardResult{
			RequestID:   "upstream-xyz",
			Model:       "claude-3-5-sonnet-20241022",
			BilledModel: "claude-3-5-sonnet-20241022",
			Usage:       ClaudeUsage{InputTokens: 1, OutputTokens: 1},
			Duration:    10 * time.Millisecond,
		},
		APIKey:    &APIKey{ID: 10},
		User:      &User{ID: 20},
		Account:   &Account{ID: 30},
		UserAgent: "ua",
	})
	if err != nil {
		t.Fatalf("RecordUsage error: %v", err)
	}

	if usageRepo.requestID != "client-req-123" {
		t.Fatalf("expected usage log request_id=%q, got %q", "client-req-123", usageRepo.requestID)
	}
}

func TestOpenAIGatewayService_RecordUsage_PrefersClientProvidedRequestID(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{
		Pricing: config.PricingConfig{MissingPolicy: "fallback_claude_only"},
		Default: config.DefaultConfig{RateMultiplier: 1.0},
	}

	usageRepo := &usageLogRepoRequestIDSpy{}
	svc := &OpenAIGatewayService{
		usageLogRepo:    usageRepo,
		cfg:             cfg,
		billingService:  NewBillingService(cfg, nil),
		deferredService: &DeferredService{},
	}

	ctx := context.WithValue(context.Background(), ctxkey.ClientRequestID, "client-req-456")
	ctx = context.WithValue(ctx, ctxkey.ClientRequestIDProvided, true)

	err := svc.RecordUsage(ctx, &OpenAIRecordUsageInput{
		Result: &OpenAIForwardResult{
			RequestID:   "upstream-abc",
			Model:       "claude-3-5-sonnet-20241022",
			BilledModel: "claude-3-5-sonnet-20241022",
			Usage:       OpenAIUsage{InputTokens: 1, OutputTokens: 1},
			Duration:    10 * time.Millisecond,
		},
		APIKey:    &APIKey{ID: 11},
		User:      &User{ID: 21},
		Account:   &Account{ID: 31},
		UserAgent: "ua",
	})
	if err != nil {
		t.Fatalf("RecordUsage error: %v", err)
	}

	if usageRepo.requestID != "client-req-456" {
		t.Fatalf("expected usage log request_id=%q, got %q", "client-req-456", usageRepo.requestID)
	}
}
