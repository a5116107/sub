//go:build unit

package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAntigravityTokenProvider_GetAccessToken_Guards(t *testing.T) {
	provider := &AntigravityTokenProvider{}

	t.Run("nil account", func(t *testing.T) {
		token, err := provider.GetAccessToken(context.Background(), nil)
		require.Error(t, err)
		require.Contains(t, err.Error(), "account is nil")
		require.Empty(t, token)
	})

	t.Run("non antigravity account", func(t *testing.T) {
		account := &Account{Platform: PlatformAnthropic, Type: AccountTypeOAuth}
		token, err := provider.GetAccessToken(context.Background(), account)
		require.Error(t, err)
		require.Contains(t, err.Error(), "not an antigravity oauth account")
		require.Empty(t, token)
	})

	t.Run("unsupported antigravity account type", func(t *testing.T) {
		account := &Account{Platform: PlatformAntigravity, Type: "unknown"}
		token, err := provider.GetAccessToken(context.Background(), account)
		require.Error(t, err)
		require.Contains(t, err.Error(), "not an antigravity oauth account")
		require.Empty(t, token)
	})
}

func TestAntigravityTokenProvider_GetAccessToken_APIKey(t *testing.T) {
	provider := &AntigravityTokenProvider{}

	t.Run("returns api key for apikey account", func(t *testing.T) {
		account := &Account{
			Platform: PlatformAntigravity,
			Type:     AccountTypeAPIKey,
			Credentials: map[string]any{
				"api_key": "ag-test-key",
			},
		}
		token, err := provider.GetAccessToken(context.Background(), account)
		require.NoError(t, err)
		require.Equal(t, "ag-test-key", token)
	})

	t.Run("apikey account missing api_key", func(t *testing.T) {
		account := &Account{
			Platform: PlatformAntigravity,
			Type:     AccountTypeAPIKey,
			Credentials: map[string]any{
				"api_key": "",
			},
		}
		token, err := provider.GetAccessToken(context.Background(), account)
		require.Error(t, err)
		require.Contains(t, err.Error(), "api_key not found in credentials")
		require.Empty(t, token)
	})

	t.Run("returns api key for upstream account", func(t *testing.T) {
		account := &Account{
			Platform: PlatformAntigravity,
			Type:     AccountTypeUpstream,
			Credentials: map[string]any{
				"api_key": "ag-upstream-key",
			},
		}
		token, err := provider.GetAccessToken(context.Background(), account)
		require.NoError(t, err)
		require.Equal(t, "ag-upstream-key", token)
	})

	t.Run("upstream account missing api_key", func(t *testing.T) {
		account := &Account{
			Platform: PlatformAntigravity,
			Type:     AccountTypeUpstream,
			Credentials: map[string]any{
				"api_key": "",
			},
		}
		token, err := provider.GetAccessToken(context.Background(), account)
		require.Error(t, err)
		require.Contains(t, err.Error(), "api_key not found in credentials")
		require.Empty(t, token)
	})
}

func TestAntigravityTokenProvider_GetAccessToken_SetupToken(t *testing.T) {
	provider := &AntigravityTokenProvider{}
	account := &Account{
		Platform: PlatformAntigravity,
		Type:     AccountTypeSetupToken,
		Credentials: map[string]any{
			"access_token": "ag-setup-token",
		},
	}

	token, err := provider.GetAccessToken(context.Background(), account)
	require.NoError(t, err)
	require.Equal(t, "ag-setup-token", token)
}
