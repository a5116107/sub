package service

import (
	"context"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

type settingRepoFeatureStub struct {
	values map[string]string
}

func (s *settingRepoFeatureStub) Get(ctx context.Context, key string) (*Setting, error) {
	return nil, ErrSettingNotFound
}
func (s *settingRepoFeatureStub) GetValue(ctx context.Context, key string) (string, error) {
	if v, ok := s.values[key]; ok {
		return v, nil
	}
	return "", ErrSettingNotFound
}
func (s *settingRepoFeatureStub) Set(ctx context.Context, key, value string) error { return nil }
func (s *settingRepoFeatureStub) GetMultiple(ctx context.Context, keys []string) (map[string]string, error) {
	out := make(map[string]string, len(keys))
	for _, k := range keys {
		out[k] = s.values[k]
	}
	return out, nil
}
func (s *settingRepoFeatureStub) SetMultiple(ctx context.Context, settings map[string]string) error {
	return nil
}
func (s *settingRepoFeatureStub) GetAll(ctx context.Context) (map[string]string, error) {
	return nil, nil
}
func (s *settingRepoFeatureStub) Delete(ctx context.Context, key string) error { return nil }

func TestSettingService_IsSubscriptionsEnabled_DefaultTrueWhenMissing(t *testing.T) {
	svc := NewSettingService(&settingRepoFeatureStub{values: map[string]string{}}, &config.Config{})
	require.True(t, svc.IsSubscriptionsEnabled(context.Background()))
}

func TestSettingService_IsSubscriptionsEnabled_FalseWhenDisabled(t *testing.T) {
	svc := NewSettingService(&settingRepoFeatureStub{values: map[string]string{
		SettingKeySubscriptionsEnabled: "false",
	}}, &config.Config{})
	require.False(t, svc.IsSubscriptionsEnabled(context.Background()))
}

func TestSettingService_IsLandingPricingEnabled_DefaultTrueWhenMissing(t *testing.T) {
	svc := NewSettingService(&settingRepoFeatureStub{values: map[string]string{}}, &config.Config{})
	require.True(t, svc.IsLandingPricingEnabled(context.Background()))
}

func TestSettingService_IsLandingPricingEnabled_FalseWhenDisabled(t *testing.T) {
	svc := NewSettingService(&settingRepoFeatureStub{values: map[string]string{
		SettingKeyLandingPricingEnabled: "off",
	}}, &config.Config{})
	require.False(t, svc.IsLandingPricingEnabled(context.Background()))
}
