package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
	"github.com/stretchr/testify/require"
)

type accountRepoForCredentialsTest struct {
	accountsByID map[int64]*Account
}

func (m *accountRepoForCredentialsTest) GetByID(ctx context.Context, id int64) (*Account, error) {
	if acc, ok := m.accountsByID[id]; ok {
		return acc, nil
	}
	return nil, errors.New("account not found")
}

func (m *accountRepoForCredentialsTest) GetByIDs(ctx context.Context, ids []int64) ([]*Account, error) {
	var out []*Account
	for _, id := range ids {
		if acc, ok := m.accountsByID[id]; ok {
			out = append(out, acc)
		}
	}
	return out, nil
}

func (m *accountRepoForCredentialsTest) ExistsByID(ctx context.Context, id int64) (bool, error) {
	_, ok := m.accountsByID[id]
	return ok, nil
}

func (m *accountRepoForCredentialsTest) Create(ctx context.Context, account *Account) error {
	return nil
}
func (m *accountRepoForCredentialsTest) GetByCRSAccountID(ctx context.Context, crsAccountID string) (*Account, error) {
	return nil, nil
}
func (m *accountRepoForCredentialsTest) Update(ctx context.Context, account *Account) error {
	return nil
}
func (m *accountRepoForCredentialsTest) Delete(ctx context.Context, id int64) error { return nil }
func (m *accountRepoForCredentialsTest) List(ctx context.Context, params pagination.PaginationParams) ([]Account, *pagination.PaginationResult, error) {
	return nil, nil, nil
}
func (m *accountRepoForCredentialsTest) ListWithFilters(ctx context.Context, params pagination.PaginationParams, platform, accountType, status, search string) ([]Account, *pagination.PaginationResult, error) {
	return nil, nil, nil
}
func (m *accountRepoForCredentialsTest) ListByGroup(ctx context.Context, groupID int64) ([]Account, error) {
	return nil, nil
}
func (m *accountRepoForCredentialsTest) ListActive(ctx context.Context) ([]Account, error) {
	return nil, nil
}
func (m *accountRepoForCredentialsTest) ListByPlatform(ctx context.Context, platform string) ([]Account, error) {
	return nil, nil
}
func (m *accountRepoForCredentialsTest) UpdateLastUsed(ctx context.Context, id int64) error {
	return nil
}
func (m *accountRepoForCredentialsTest) BatchUpdateLastUsed(ctx context.Context, updates map[int64]time.Time) error {
	return nil
}
func (m *accountRepoForCredentialsTest) SetError(ctx context.Context, id int64, errorMsg string) error {
	return nil
}
func (m *accountRepoForCredentialsTest) ClearError(ctx context.Context, id int64) error {
	return nil
}
func (m *accountRepoForCredentialsTest) SetSchedulable(ctx context.Context, id int64, schedulable bool) error {
	return nil
}
func (m *accountRepoForCredentialsTest) AutoPauseExpiredAccounts(ctx context.Context, now time.Time) (int64, error) {
	return 0, nil
}
func (m *accountRepoForCredentialsTest) BindGroups(ctx context.Context, accountID int64, groupIDs []int64) error {
	return nil
}
func (m *accountRepoForCredentialsTest) ListSchedulable(ctx context.Context) ([]Account, error) {
	return nil, nil
}
func (m *accountRepoForCredentialsTest) ListSchedulableByGroupID(ctx context.Context, groupID int64) ([]Account, error) {
	return nil, nil
}
func (m *accountRepoForCredentialsTest) ListSchedulableByPlatform(ctx context.Context, platform string) ([]Account, error) {
	return nil, nil
}
func (m *accountRepoForCredentialsTest) ListSchedulableByGroupIDAndPlatform(ctx context.Context, groupID int64, platform string) ([]Account, error) {
	return nil, nil
}
func (m *accountRepoForCredentialsTest) ListSchedulableByPlatforms(ctx context.Context, platforms []string) ([]Account, error) {
	return nil, nil
}
func (m *accountRepoForCredentialsTest) ListSchedulableByGroupIDAndPlatforms(ctx context.Context, groupID int64, platforms []string) ([]Account, error) {
	return nil, nil
}
func (m *accountRepoForCredentialsTest) SetRateLimited(ctx context.Context, id int64, resetAt time.Time) error {
	return nil
}
func (m *accountRepoForCredentialsTest) SetAntigravityQuotaScopeLimit(ctx context.Context, id int64, scope AntigravityQuotaScope, resetAt time.Time) error {
	return nil
}
func (m *accountRepoForCredentialsTest) SetModelRateLimit(ctx context.Context, id int64, scope string, resetAt time.Time) error {
	return nil
}
func (m *accountRepoForCredentialsTest) SetOverloaded(ctx context.Context, id int64, until time.Time) error {
	return nil
}
func (m *accountRepoForCredentialsTest) SetTempUnschedulable(ctx context.Context, id int64, until time.Time, reason string) error {
	return nil
}
func (m *accountRepoForCredentialsTest) ClearTempUnschedulable(ctx context.Context, id int64) error {
	return nil
}
func (m *accountRepoForCredentialsTest) ClearRateLimit(ctx context.Context, id int64) error {
	return nil
}
func (m *accountRepoForCredentialsTest) ClearAntigravityQuotaScopes(ctx context.Context, id int64) error {
	return nil
}
func (m *accountRepoForCredentialsTest) ClearModelRateLimits(ctx context.Context, id int64) error {
	return nil
}
func (m *accountRepoForCredentialsTest) UpdateSessionWindow(ctx context.Context, id int64, start, end *time.Time, status string) error {
	return nil
}
func (m *accountRepoForCredentialsTest) UpdateExtra(ctx context.Context, id int64, updates map[string]any) error {
	return nil
}
func (m *accountRepoForCredentialsTest) BulkUpdate(ctx context.Context, ids []int64, updates AccountBulkUpdate) (int64, error) {
	return 0, nil
}

var _ AccountRepository = (*accountRepoForCredentialsTest)(nil)

func TestAccountService_TestCredentials_AnthropicOAuth(t *testing.T) {
	svc := &AccountService{
		accountRepo: &accountRepoForCredentialsTest{
			accountsByID: map[int64]*Account{
				1: {
					ID:          1,
					Platform:    PlatformAnthropic,
					Type:        AccountTypeOAuth,
					Credentials: map[string]any{
						// missing access_token
					},
				},
			},
		},
	}

	err := svc.TestCredentials(context.Background(), 1)
	require.Error(t, err)
}

func TestAccountService_TestCredentials_OpenAIApiKey_InvalidBaseURL(t *testing.T) {
	svc := &AccountService{
		accountRepo: &accountRepoForCredentialsTest{
			accountsByID: map[int64]*Account{
				1: {
					ID:       1,
					Platform: PlatformOpenAI,
					Type:     AccountTypeAPIKey,
					Credentials: map[string]any{
						"api_key":    "sk-test",
						"base_url":   "http://example.com",
						"user_agent": "ua",
					},
				},
			},
		},
	}

	err := svc.TestCredentials(context.Background(), 1)
	require.Error(t, err)
}

func TestAccountService_TestCredentials_OpenAIOAuth_ExpiredWithoutRefreshToken(t *testing.T) {
	expiredAt := time.Now().Add(-time.Hour).Format(time.RFC3339)
	svc := &AccountService{
		accountRepo: &accountRepoForCredentialsTest{
			accountsByID: map[int64]*Account{
				1: {
					ID:       1,
					Platform: PlatformOpenAI,
					Type:     AccountTypeOAuth,
					Credentials: map[string]any{
						"access_token": "test",
						"expires_at":   expiredAt,
						// missing refresh_token
					},
				},
			},
		},
	}

	err := svc.TestCredentials(context.Background(), 1)
	require.Error(t, err)
}

func TestAccountService_TestCredentials_GeminiOAuth_MissingTokens(t *testing.T) {
	svc := &AccountService{
		accountRepo: &accountRepoForCredentialsTest{
			accountsByID: map[int64]*Account{
				1: {
					ID:          1,
					Platform:    PlatformGemini,
					Type:        AccountTypeOAuth,
					Credentials: map[string]any{
						// missing access_token and refresh_token
					},
				},
			},
		},
	}

	err := svc.TestCredentials(context.Background(), 1)
	require.Error(t, err)
}
