package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
	"github.com/Wei-Shaw/sub2api/internal/pkg/usagestats"
)

type usageLogRepoBilledModelStub struct {
	created *UsageLog
}

func (s *usageLogRepoBilledModelStub) Create(ctx context.Context, log *UsageLog) (bool, error) {
	s.created = log
	return true, nil
}
func (s *usageLogRepoBilledModelStub) CreateBillingUsageEntry(ctx context.Context, entry *BillingUsageEntry) (bool, error) {
	return false, errors.New("unexpected CreateBillingUsageEntry call")
}
func (s *usageLogRepoBilledModelStub) MarkBillingUsageEntryApplied(ctx context.Context, id int64) error {
	return errors.New("unexpected MarkBillingUsageEntryApplied call")
}
func (s *usageLogRepoBilledModelStub) GetByID(ctx context.Context, id int64) (*UsageLog, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) Delete(ctx context.Context, id int64) error {
	return errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) ListByUser(ctx context.Context, userID int64, params pagination.PaginationParams) ([]UsageLog, *pagination.PaginationResult, error) {
	return nil, nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) ListByAPIKey(ctx context.Context, apiKeyID int64, params pagination.PaginationParams) ([]UsageLog, *pagination.PaginationResult, error) {
	return nil, nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) ListByAccount(ctx context.Context, accountID int64, params pagination.PaginationParams) ([]UsageLog, *pagination.PaginationResult, error) {
	return nil, nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) ListByUserAndTimeRange(ctx context.Context, userID int64, startTime, endTime time.Time) ([]UsageLog, *pagination.PaginationResult, error) {
	return nil, nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) ListByAPIKeyAndTimeRange(ctx context.Context, apiKeyID int64, startTime, endTime time.Time) ([]UsageLog, *pagination.PaginationResult, error) {
	return nil, nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) ListByAccountAndTimeRange(ctx context.Context, accountID int64, startTime, endTime time.Time) ([]UsageLog, *pagination.PaginationResult, error) {
	return nil, nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) ListByModelAndTimeRange(ctx context.Context, modelName string, startTime, endTime time.Time) ([]UsageLog, *pagination.PaginationResult, error) {
	return nil, nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetAccountWindowStats(ctx context.Context, accountID int64, startTime time.Time) (*usagestats.AccountStats, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetAccountTodayStats(ctx context.Context, accountID int64) (*usagestats.AccountStats, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetDashboardStats(ctx context.Context) (*usagestats.DashboardStats, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetUsageTrendWithFilters(ctx context.Context, startTime, endTime time.Time, granularity string, userID, apiKeyID, accountID, groupID int64, model string, stream *bool, billingType *int8) ([]usagestats.TrendDataPoint, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetModelStatsWithFilters(ctx context.Context, startTime, endTime time.Time, userID, apiKeyID, accountID, groupID int64, stream *bool, billingType *int8) ([]usagestats.ModelStat, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetAPIKeyUsageTrend(ctx context.Context, startTime, endTime time.Time, granularity string, limit int) ([]usagestats.APIKeyUsageTrendPoint, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetUserUsageTrend(ctx context.Context, startTime, endTime time.Time, granularity string, limit int) ([]usagestats.UserUsageTrendPoint, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetBatchUserUsageStats(ctx context.Context, userIDs []int64) (map[int64]*usagestats.BatchUserUsageStats, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetBatchAPIKeyUsageStats(ctx context.Context, apiKeyIDs []int64) (map[int64]*usagestats.BatchAPIKeyUsageStats, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetUserDashboardStats(ctx context.Context, userID int64) (*usagestats.UserDashboardStats, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetUserUsageTrendByUserID(ctx context.Context, userID int64, startTime, endTime time.Time, granularity string) ([]usagestats.TrendDataPoint, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetUserModelStats(ctx context.Context, userID int64, startTime, endTime time.Time) ([]usagestats.ModelStat, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) ListWithFilters(ctx context.Context, params pagination.PaginationParams, filters usagestats.UsageLogFilters) ([]UsageLog, *pagination.PaginationResult, error) {
	return nil, nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetGlobalStats(ctx context.Context, startTime, endTime time.Time) (*usagestats.UsageStats, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetStatsWithFilters(ctx context.Context, filters usagestats.UsageLogFilters) (*usagestats.UsageStats, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetAccountUsageStats(ctx context.Context, accountID int64, startTime, endTime time.Time) (*usagestats.AccountUsageStatsResponse, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetUserStatsAggregated(ctx context.Context, userID int64, startTime, endTime time.Time) (*usagestats.UsageStats, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetAPIKeyStatsAggregated(ctx context.Context, apiKeyID int64, startTime, endTime time.Time) (*usagestats.UsageStats, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetAccountStatsAggregated(ctx context.Context, accountID int64, startTime, endTime time.Time) (*usagestats.UsageStats, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetModelStatsAggregated(ctx context.Context, modelName string, startTime, endTime time.Time) (*usagestats.UsageStats, error) {
	return nil, errors.New("not implemented")
}
func (s *usageLogRepoBilledModelStub) GetDailyStatsAggregated(ctx context.Context, userID int64, startTime, endTime time.Time) ([]map[string]any, error) {
	return nil, errors.New("not implemented")
}

func TestGatewayService_RecordUsage_BillsByBilledModel(t *testing.T) {
	cfg := &config.Config{
		RunMode: config.RunModeSimple,
	}
	cfg.Default.RateMultiplier = 1.0
	cfg.Pricing.MissingPolicy = "fail_close"

	pricing := &PricingService{
		pricingData: map[string]*LiteLLMModelPricing{
			"real-model": {
				InputCostPerToken:  1e-6,
				OutputCostPerToken: 2e-6,
			},
		},
	}
	billing := NewBillingService(cfg, pricing)

	repo := &usageLogRepoBilledModelStub{}
	svc := &GatewayService{
		cfg:             cfg,
		billingService:  billing,
		usageLogRepo:    repo,
		deferredService: &DeferredService{},
	}

	user := &User{ID: 1, Status: StatusActive, Role: RoleUser}
	apiKey := &APIKey{ID: 2, UserID: user.ID, Status: StatusActive, User: user}
	account := &Account{ID: 3, Status: StatusActive}

	result := &ForwardResult{
		RequestID:   "rid",
		Model:       "alias-model",
		BilledModel: "real-model",
		Usage: ClaudeUsage{
			InputTokens:  100,
			OutputTokens: 10,
		},
	}

	err := svc.RecordUsage(context.Background(), &RecordUsageInput{
		Result:  result,
		APIKey:  apiKey,
		User:    user,
		Account: account,
	})
	if err != nil {
		t.Fatalf("RecordUsage returned error: %v", err)
	}
	if repo.created == nil {
		t.Fatalf("expected usage log to be created")
	}
	if repo.created.TotalCost <= 0 {
		t.Fatalf("expected TotalCost > 0 when billed_model has pricing; got %v", repo.created.TotalCost)
	}
	if repo.created.BilledModel == nil || *repo.created.BilledModel != "real-model" {
		t.Fatalf("expected billed_model=real-model, got %#v", repo.created.BilledModel)
	}
}

func TestGatewayService_RecordUsage_ImageBillsByBilledModel(t *testing.T) {
	cfg := &config.Config{
		RunMode: config.RunModeSimple,
	}
	cfg.Default.RateMultiplier = 1.0
	cfg.Pricing.MissingPolicy = "fail_close"

	pricing := &PricingService{
		pricingData: map[string]*LiteLLMModelPricing{
			"real-image-model": {
				OutputCostPerImage: 0.5,
			},
		},
	}
	billing := NewBillingService(cfg, pricing)

	repo := &usageLogRepoBilledModelStub{}
	svc := &GatewayService{
		cfg:             cfg,
		billingService:  billing,
		usageLogRepo:    repo,
		deferredService: &DeferredService{},
	}

	user := &User{ID: 1, Status: StatusActive, Role: RoleUser}
	apiKey := &APIKey{ID: 2, UserID: user.ID, Status: StatusActive, User: user}
	account := &Account{ID: 3, Status: StatusActive}

	result := &ForwardResult{
		RequestID:   "rid",
		Model:       "alias-image-model",
		BilledModel: "real-image-model",
		ImageCount:  1,
		ImageSize:   "1K",
	}

	err := svc.RecordUsage(context.Background(), &RecordUsageInput{
		Result:  result,
		APIKey:  apiKey,
		User:    user,
		Account: account,
	})
	if err != nil {
		t.Fatalf("RecordUsage returned error: %v", err)
	}
	if repo.created == nil {
		t.Fatalf("expected usage log to be created")
	}
	if repo.created.TotalCost != 0.5 {
		t.Fatalf("expected TotalCost=0.5 when billed_model has output_cost_per_image; got %v", repo.created.TotalCost)
	}
	if repo.created.BilledModel == nil || *repo.created.BilledModel != "real-image-model" {
		t.Fatalf("expected billed_model=real-image-model, got %#v", repo.created.BilledModel)
	}
}
