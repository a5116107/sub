package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	middleware "github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type settingRepoStub struct {
	values map[string]string
}

func (s *settingRepoStub) Get(ctx context.Context, key string) (*service.Setting, error) {
	return nil, service.ErrSettingNotFound
}
func (s *settingRepoStub) GetValue(ctx context.Context, key string) (string, error) {
	if v, ok := s.values[key]; ok {
		return v, nil
	}
	return "", service.ErrSettingNotFound
}
func (s *settingRepoStub) Set(ctx context.Context, key, value string) error { return nil }
func (s *settingRepoStub) GetMultiple(ctx context.Context, keys []string) (map[string]string, error) {
	out := make(map[string]string, len(keys))
	for _, k := range keys {
		out[k] = s.values[k]
	}
	return out, nil
}
func (s *settingRepoStub) SetMultiple(ctx context.Context, settings map[string]string) error {
	return nil
}
func (s *settingRepoStub) GetAll(ctx context.Context) (map[string]string, error) { return nil, nil }
func (s *settingRepoStub) Delete(ctx context.Context, key string) error          { return nil }

func TestSubscriptionHandler_List_SubscriptionsDisabled(t *testing.T) {
	gin.SetMode(gin.TestMode)

	settingService := service.NewSettingService(&settingRepoStub{
		values: map[string]string{
			service.SettingKeySubscriptionsEnabled: "false",
		},
	}, &config.Config{})

	h := NewSubscriptionHandler(nil, settingService)

	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(string(middleware.ContextKeyUser), middleware.AuthSubject{UserID: 1, Concurrency: 1})
		c.Next()
	})
	r.GET("/api/v1/subscriptions", h.List)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/subscriptions", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	require.Equal(t, http.StatusForbidden, rec.Code)
	require.JSONEq(t, `{"code":403,"message":"subscriptions are currently disabled","reason":"SUBSCRIPTIONS_DISABLED"}`, rec.Body.String())
}
