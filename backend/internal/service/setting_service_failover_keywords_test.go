package service

import (
	"context"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

type settingRepoFailoverKeywordsStub struct {
	values  map[string]string
	lastSet map[string]string
}

func (s *settingRepoFailoverKeywordsStub) Get(ctx context.Context, key string) (*Setting, error) {
	if v, ok := s.values[key]; ok {
		return &Setting{Key: key, Value: v}, nil
	}
	return nil, ErrSettingNotFound
}

func (s *settingRepoFailoverKeywordsStub) GetValue(ctx context.Context, key string) (string, error) {
	if v, ok := s.values[key]; ok {
		return v, nil
	}
	return "", ErrSettingNotFound
}

func (s *settingRepoFailoverKeywordsStub) Set(ctx context.Context, key, value string) error {
	if s.values == nil {
		s.values = make(map[string]string)
	}
	s.values[key] = value
	return nil
}

func (s *settingRepoFailoverKeywordsStub) GetMultiple(ctx context.Context, keys []string) (map[string]string, error) {
	result := make(map[string]string, len(keys))
	for _, key := range keys {
		if v, ok := s.values[key]; ok {
			result[key] = v
		}
	}
	return result, nil
}

func (s *settingRepoFailoverKeywordsStub) SetMultiple(ctx context.Context, settings map[string]string) error {
	if s.values == nil {
		s.values = make(map[string]string)
	}
	s.lastSet = make(map[string]string, len(settings))
	for key, value := range settings {
		s.values[key] = value
		s.lastSet[key] = value
	}
	return nil
}

func (s *settingRepoFailoverKeywordsStub) GetAll(ctx context.Context) (map[string]string, error) {
	result := make(map[string]string, len(s.values))
	for key, value := range s.values {
		result[key] = value
	}
	return result, nil
}

func (s *settingRepoFailoverKeywordsStub) Delete(ctx context.Context, key string) error {
	delete(s.values, key)
	return nil
}

func TestSettingService_ParseSettings_FailoverKeywords_DefaultFromConfig(t *testing.T) {
	cfg := &config.Config{
		Gateway: config.GatewayConfig{
			FailoverSensitive400Keywords: []string{"wallet depleted"},
			FailoverTemporary400Keywords: []string{"maintenance window"},
			FailoverRequestErrorKeywords: []string{"route dropped"},
		},
	}
	svc := NewSettingService(&settingRepoFailoverKeywordsStub{values: map[string]string{}}, cfg)

	settings := svc.parseSettings(map[string]string{})

	require.Equal(t, []string{"wallet depleted"}, settings.GatewayFailoverSensitive400Keywords)
	require.Equal(t, []string{"maintenance window"}, settings.GatewayFailoverTemporary400Keywords)
	require.Equal(t, []string{"route dropped"}, settings.GatewayFailoverRequestErrorKeywords)
}

func TestSettingService_ParseSettings_FailoverKeywords_FromJSON(t *testing.T) {
	svc := NewSettingService(&settingRepoFailoverKeywordsStub{values: map[string]string{}}, &config.Config{})

	settings := svc.parseSettings(map[string]string{
		SettingKeyGatewayFailoverSensitive400Keywords: `[" wallet depleted ","wallet depleted","balance low"]`,
		SettingKeyGatewayFailoverTemporary400Keywords: `["maintenance mode"]`,
		SettingKeyGatewayFailoverRequestErrorKeywords: `["upstream eof"]`,
	})

	require.Equal(t, []string{"wallet depleted", "balance low"}, settings.GatewayFailoverSensitive400Keywords)
	require.Equal(t, []string{"maintenance mode"}, settings.GatewayFailoverTemporary400Keywords)
	require.Equal(t, []string{"upstream eof"}, settings.GatewayFailoverRequestErrorKeywords)
}

func TestSettingService_GetGatewayFailoverKeywords_DBAndFallback(t *testing.T) {
	repo := &settingRepoFailoverKeywordsStub{
		values: map[string]string{
			SettingKeyGatewayFailoverSensitive400Keywords: `["db sensitive"]`,
			SettingKeyGatewayFailoverTemporary400Keywords: `[]`,
			SettingKeyGatewayFailoverRequestErrorKeywords: ``,
		},
	}
	cfg := &config.Config{
		Gateway: config.GatewayConfig{
			FailoverSensitive400Keywords: []string{"cfg sensitive"},
			FailoverTemporary400Keywords: []string{"cfg temporary"},
			FailoverRequestErrorKeywords: []string{"cfg request"},
		},
	}
	svc := NewSettingService(repo, cfg)

	require.Equal(t, []string{"db sensitive"}, svc.GetGatewayFailoverSensitive400Keywords(context.Background()))
	require.Equal(t, []string{}, svc.GetGatewayFailoverTemporary400Keywords(context.Background()))
	require.Equal(t, []string{"cfg request"}, svc.GetGatewayFailoverRequestErrorKeywords(context.Background()))
}

func TestSettingService_UpdateSettings_PersistsFailoverKeywordsAsJSON(t *testing.T) {
	repo := &settingRepoFailoverKeywordsStub{values: map[string]string{}}
	svc := NewSettingService(repo, &config.Config{})

	err := svc.UpdateSettings(context.Background(), &SystemSettings{
		GatewayFixOrphanedToolResults:       true,
		GatewayFailoverSensitive400Keywords: []string{" wallet depleted ", "wallet depleted"},
		GatewayFailoverTemporary400Keywords: []string{"maintenance mode"},
		GatewayFailoverRequestErrorKeywords: []string{"EOF", "eof"},
		OpsMonitoringEnabled:                true,
		OpsRealtimeMonitoringEnabled:        true,
		OpsQueryModeDefault:                 "auto",
		OpsMetricsIntervalSeconds:           60,
	})
	require.NoError(t, err)

	require.JSONEq(t, `["wallet depleted"]`, repo.lastSet[SettingKeyGatewayFailoverSensitive400Keywords])
	require.JSONEq(t, `["maintenance mode"]`, repo.lastSet[SettingKeyGatewayFailoverTemporary400Keywords])
	require.JSONEq(t, `["EOF"]`, repo.lastSet[SettingKeyGatewayFailoverRequestErrorKeywords])
}

func TestSettingService_ParseSettings_CodexModelAliases_DefaultFromConfig(t *testing.T) {
	cfg := &config.Config{
		Gateway: config.GatewayConfig{
			CodexModelAliases: map[string]string{
				" GPT-5.3-Code ": " gpt-5.3-codex ",
			},
		},
	}
	svc := NewSettingService(&settingRepoFailoverKeywordsStub{values: map[string]string{}}, cfg)

	settings := svc.parseSettings(map[string]string{})

	require.Equal(t, map[string]string{"gpt-5.3-code": "gpt-5.3-codex"}, settings.GatewayCodexModelAliases)
}

func TestSettingService_ParseSettings_CodexModelAliases_FromJSON(t *testing.T) {
	svc := NewSettingService(&settingRepoFailoverKeywordsStub{values: map[string]string{}}, &config.Config{})

	settings := svc.parseSettings(map[string]string{
		SettingKeyGatewayCodexModelAliases: `{" GPT-5.3-Code ":" gpt-5.3-codex ","bad":"","":"x"}`,
	})

	require.Equal(t, map[string]string{"gpt-5.3-code": "gpt-5.3-codex"}, settings.GatewayCodexModelAliases)
}

func TestSettingService_UpdateSettings_PersistsCodexModelAliasesAsJSON(t *testing.T) {
	ConfigureCodexModelAliases(nil)
	t.Cleanup(func() { ConfigureCodexModelAliases(nil) })

	repo := &settingRepoFailoverKeywordsStub{values: map[string]string{}}
	svc := NewSettingService(repo, &config.Config{})

	err := svc.UpdateSettings(context.Background(), &SystemSettings{
		GatewayFixOrphanedToolResults: true,
		GatewayCodexModelAliases: map[string]string{
			" GPT-5.3-Code ": " gpt-5.3-codex ",
			"":               "x",
			"bad":            "",
		},
		OpsMonitoringEnabled:         true,
		OpsRealtimeMonitoringEnabled: true,
		OpsQueryModeDefault:          "auto",
		OpsMetricsIntervalSeconds:    60,
	})
	require.NoError(t, err)

	require.JSONEq(t, `{"gpt-5.3-code":"gpt-5.3-codex"}`, repo.lastSet[SettingKeyGatewayCodexModelAliases])
}
