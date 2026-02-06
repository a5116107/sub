package admin

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type settingRepoSubscriptionStub struct {
	values map[string]string
}

func (s *settingRepoSubscriptionStub) Get(ctx context.Context, key string) (*service.Setting, error) {
	return nil, service.ErrSettingNotFound
}
func (s *settingRepoSubscriptionStub) GetValue(ctx context.Context, key string) (string, error) {
	if v, ok := s.values[key]; ok {
		return v, nil
	}
	return "", service.ErrSettingNotFound
}
func (s *settingRepoSubscriptionStub) Set(ctx context.Context, key, value string) error { return nil }
func (s *settingRepoSubscriptionStub) GetMultiple(ctx context.Context, keys []string) (map[string]string, error) {
	out := make(map[string]string, len(keys))
	for _, k := range keys {
		out[k] = s.values[k]
	}
	return out, nil
}
func (s *settingRepoSubscriptionStub) SetMultiple(ctx context.Context, settings map[string]string) error {
	return nil
}
func (s *settingRepoSubscriptionStub) GetAll(ctx context.Context) (map[string]string, error) {
	return nil, nil
}
func (s *settingRepoSubscriptionStub) Delete(ctx context.Context, key string) error { return nil }

func TestAdminSubscriptionHandler_List_SubscriptionsDisabled(t *testing.T) {
	gin.SetMode(gin.TestMode)

	settingService := service.NewSettingService(&settingRepoSubscriptionStub{
		values: map[string]string{
			service.SettingKeySubscriptionsEnabled: "false",
		},
	}, &config.Config{})

	h := NewSubscriptionHandler(nil, settingService)

	r := gin.New()
	r.GET("/api/v1/admin/subscriptions", h.List)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/subscriptions?page=1&page_size=10", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	require.Equal(t, http.StatusForbidden, rec.Code)
	require.JSONEq(t, `{"code":403,"message":"subscriptions are currently disabled","reason":"SUBSCRIPTIONS_DISABLED"}`, rec.Body.String())
}
