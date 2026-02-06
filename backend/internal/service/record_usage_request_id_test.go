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

func TestGatewayService_RecordUsage_DoesNotOverrideRequestIDWithClientProvidedID(t *testing.T) {
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

	if usageRepo.requestID != "upstream-xyz" {
		t.Fatalf("expected usage log request_id=%q, got %q", "upstream-xyz", usageRepo.requestID)
	}
}

func TestOpenAIGatewayService_RecordUsage_DoesNotOverrideRequestIDWithClientProvidedID(t *testing.T) {
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

	if usageRepo.requestID != "upstream-abc" {
		t.Fatalf("expected usage log request_id=%q, got %q", "upstream-abc", usageRepo.requestID)
	}
}

func TestGatewayService_RecordUsage_GeneratesRequestIDWhenUpstreamMissing(t *testing.T) {
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

	ctx := context.WithValue(context.Background(), ctxkey.ClientRequestID, "client-req-789")
	ctx = context.WithValue(ctx, ctxkey.ClientRequestIDProvided, true)

	err := svc.RecordUsage(ctx, &RecordUsageInput{
		Result: &ForwardResult{
			RequestID:   "",
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

	if usageRepo.requestID == "" {
		t.Fatalf("expected non-empty usage log request_id")
	}
	if usageRepo.requestID == "client-req-789" {
		t.Fatalf("expected generated request_id not to equal client request id")
	}
	if len(usageRepo.requestID) > 64 {
		t.Fatalf("expected request_id <= 64 chars, got len=%d", len(usageRepo.requestID))
	}
}

func TestOpenAIGatewayService_RecordUsage_GeneratesRequestIDWhenUpstreamMissing(t *testing.T) {
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

	ctx := context.WithValue(context.Background(), ctxkey.ClientRequestID, "client-req-999")
	ctx = context.WithValue(ctx, ctxkey.ClientRequestIDProvided, true)

	err := svc.RecordUsage(ctx, &OpenAIRecordUsageInput{
		Result: &OpenAIForwardResult{
			RequestID:   "",
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

	if usageRepo.requestID == "" {
		t.Fatalf("expected non-empty usage log request_id")
	}
	if usageRepo.requestID == "client-req-999" {
		t.Fatalf("expected generated request_id not to equal client request id")
	}
	if len(usageRepo.requestID) > 64 {
		t.Fatalf("expected request_id <= 64 chars, got len=%d", len(usageRepo.requestID))
	}
}
