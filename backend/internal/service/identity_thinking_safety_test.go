package service

import (
	"bytes"
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

type identityThinkingCacheStub struct {
	maskedSessionID string
}

func (s *identityThinkingCacheStub) GetFingerprint(ctx context.Context, accountID int64) (*Fingerprint, error) {
	return nil, nil
}

func (s *identityThinkingCacheStub) SetFingerprint(ctx context.Context, accountID int64, fp *Fingerprint) error {
	return nil
}

func (s *identityThinkingCacheStub) GetMaskedSessionID(ctx context.Context, accountID int64) (string, error) {
	return s.maskedSessionID, nil
}

func (s *identityThinkingCacheStub) SetMaskedSessionID(ctx context.Context, accountID int64, sessionID string) error {
	s.maskedSessionID = sessionID
	return nil
}

func TestRewriteUserID_PreservesMessagesRawBytes(t *testing.T) {
	cache := &identityThinkingCacheStub{}
	svc := NewIdentityService(cache)
	originalUserID := "user_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_account__session_123e4567-e89b-12d3-a456-426614174000"
	body := []byte(`{
		"metadata":{"user_id":"` + originalUserID + `"},
		"messages":[{"role":"assistant","content":[{"type":"thinking","thinking":"plan","signature":"sig","extra":{"v":1.0}}]}]
	}`)

	rewritten, err := svc.RewriteUserID(body, 42, "account-uuid", "cached-client-id")
	require.NoError(t, err)

	originalRaw := mustParseTopLevelRaw(t, body)
	rewrittenRaw := mustParseTopLevelRaw(t, rewritten)
	require.True(t, bytes.Equal(originalRaw["messages"], rewrittenRaw["messages"]))

	var metadata map[string]any
	require.NoError(t, json.Unmarshal(rewrittenRaw["metadata"], &metadata))
	rewrittenUserID, _ := metadata["user_id"].(string)
	require.NotEmpty(t, rewrittenUserID)
	require.NotEqual(t, originalUserID, rewrittenUserID)
	require.True(t, strings.Contains(rewrittenUserID, "user_cached-client-id_account_account-uuid_session_"))
}

func TestRewriteUserIDWithMasking_PreservesMessagesRawBytes(t *testing.T) {
	cache := &identityThinkingCacheStub{maskedSessionID: "11111111-1111-4111-8111-111111111111"}
	svc := NewIdentityService(cache)
	originalUserID := "user_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_account__session_123e4567-e89b-12d3-a456-426614174000"
	body := []byte(`{
		"metadata":{"user_id":"` + originalUserID + `"},
		"messages":[{"role":"assistant","content":[{"type":"thinking","thinking":"plan","signature":"sig","extra":{"v":1.0}}]}]
	}`)

	account := &Account{
		ID:       1001,
		Platform: PlatformAnthropic,
		Type:     AccountTypeOAuth,
		Extra: map[string]any{
			"session_id_masking_enabled": true,
		},
	}

	rewritten, err := svc.RewriteUserIDWithMasking(context.Background(), body, account, "account-uuid", "cached-client-id")
	require.NoError(t, err)

	originalRaw := mustParseTopLevelRaw(t, body)
	rewrittenRaw := mustParseTopLevelRaw(t, rewritten)
	require.True(t, bytes.Equal(originalRaw["messages"], rewrittenRaw["messages"]))

	var metadata map[string]any
	require.NoError(t, json.Unmarshal(rewrittenRaw["metadata"], &metadata))
	rewrittenUserID, _ := metadata["user_id"].(string)
	require.NotEmpty(t, rewrittenUserID)
	require.True(t, strings.HasSuffix(rewrittenUserID, "_session_"+cache.maskedSessionID))
}
