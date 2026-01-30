package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type userSubRepoActiveStub struct {
	service.UserSubscriptionRepository
	sub *service.UserSubscription
}

func (s userSubRepoActiveStub) GetActiveByUserIDAndGroupID(_ context.Context, userID, groupID int64) (*service.UserSubscription, error) {
	if s.sub == nil || s.sub.UserID != userID || s.sub.GroupID != groupID {
		return nil, service.ErrSubscriptionNotFound
	}
	clone := *s.sub
	return &clone, nil
}

func TestAPIKeyAuth_SubscriptionGroup_IgnoresAllowedGroupsWhenSubscriptionActive(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	group := &service.Group{
		ID:               101,
		Name:             "sub",
		Status:           service.StatusActive,
		Platform:         service.PlatformAnthropic,
		Hydrated:         true,
		SubscriptionType: service.SubscriptionTypeSubscription,
		IsExclusive:      true,
	}
	user := &service.User{
		ID:            7,
		Role:          service.RoleUser,
		Status:        service.StatusActive,
		Balance:       0,
		Concurrency:   3,
		AllowedGroups: []int64{999}, // does not include group.ID
	}
	apiKey := &service.APIKey{
		ID:     100,
		UserID: user.ID,
		Key:    "test-key",
		Status: service.StatusActive,
		User:   user,
		Group:  group,
	}
	apiKey.GroupID = &group.ID

	now := time.Now()
	sub := &service.UserSubscription{
		ID:        1,
		UserID:    user.ID,
		GroupID:   group.ID,
		Status:    service.SubscriptionStatusActive,
		StartsAt:  now.Add(-24 * time.Hour),
		ExpiresAt: now.Add(24 * time.Hour),
		DailyWindowStart: func() *time.Time {
			v := now.Add(-1 * time.Hour)
			return &v
		}(),
	}

	apiKeyService := service.NewAPIKeyService(
		fakeAPIKeyRepo{
			getByKey: func(ctx context.Context, key string) (*service.APIKey, error) {
				if key != apiKey.Key {
					return nil, service.ErrAPIKeyNotFound
				}
				clone := *apiKey
				return &clone, nil
			},
		},
		nil,
		nil,
		nil,
		nil,
		&config.Config{RunMode: "prod"},
	)

	subscriptionService := service.NewSubscriptionService(nil, userSubRepoActiveStub{sub: sub}, nil)

	cfg := &config.Config{RunMode: "prod"}
	router := gin.New()
	router.Use(gin.HandlerFunc(NewAPIKeyAuthMiddleware(apiKeyService, subscriptionService, cfg)))
	router.GET("/t", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })

	req := httptest.NewRequest(http.MethodGet, "/t", nil)
	req.Header.Set("x-api-key", apiKey.Key)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
}

func TestAPIKeyAuthGoogle_SubscriptionGroup_IgnoresAllowedGroupsWhenSubscriptionActive(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	group := &service.Group{
		ID:               101,
		Name:             "sub",
		Status:           service.StatusActive,
		Platform:         service.PlatformAnthropic,
		Hydrated:         true,
		SubscriptionType: service.SubscriptionTypeSubscription,
		IsExclusive:      true,
	}
	user := &service.User{
		ID:            7,
		Role:          service.RoleUser,
		Status:        service.StatusActive,
		Balance:       0,
		Concurrency:   3,
		AllowedGroups: []int64{999}, // does not include group.ID
	}
	apiKey := &service.APIKey{
		ID:     100,
		UserID: user.ID,
		Key:    "test-key",
		Status: service.StatusActive,
		User:   user,
		Group:  group,
	}
	apiKey.GroupID = &group.ID

	now := time.Now()
	sub := &service.UserSubscription{
		ID:        1,
		UserID:    user.ID,
		GroupID:   group.ID,
		Status:    service.SubscriptionStatusActive,
		StartsAt:  now.Add(-24 * time.Hour),
		ExpiresAt: now.Add(24 * time.Hour),
		DailyWindowStart: func() *time.Time {
			v := now.Add(-1 * time.Hour)
			return &v
		}(),
	}

	apiKeyService := service.NewAPIKeyService(
		fakeAPIKeyRepo{
			getByKey: func(ctx context.Context, key string) (*service.APIKey, error) {
				if key != apiKey.Key {
					return nil, service.ErrAPIKeyNotFound
				}
				clone := *apiKey
				return &clone, nil
			},
		},
		nil,
		nil,
		nil,
		nil,
		&config.Config{RunMode: "prod"},
	)

	subscriptionService := service.NewSubscriptionService(nil, userSubRepoActiveStub{sub: sub}, nil)

	cfg := &config.Config{RunMode: "prod"}
	router := gin.New()
	router.Use(APIKeyAuthWithSubscriptionGoogle(apiKeyService, subscriptionService, cfg))
	router.GET("/t", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })

	req := httptest.NewRequest(http.MethodGet, "/t", nil)
	req.Header.Set("x-api-key", apiKey.Key)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
}
