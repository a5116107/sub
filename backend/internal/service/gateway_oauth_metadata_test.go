package service

import (
	"regexp"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestBuildOAuthMetadataUserID_FallbackWithoutAccountUUID(t *testing.T) {
	svc := &GatewayService{}

	parsed := &ParsedRequest{
		Model:          "claude-sonnet-4-5",
		Stream:         true,
		MetadataUserID: "",
	}

	account := &Account{
		ID:    123,
		Type:  AccountTypeOAuth,
		Extra: map[string]any{},
	}

	fp := &Fingerprint{ClientID: "deadbeef"}

	got := svc.buildOAuthMetadataUserID(parsed, account, fp)
	require.NotEmpty(t, got)

	re := regexp.MustCompile(`^user_[a-zA-Z0-9]+_account__session_[a-f0-9-]{36}$`)
	require.True(t, re.MatchString(got), "unexpected user_id format: %s", got)
}

func TestBuildOAuthMetadataUserID_UsesAccountUUIDWhenPresent(t *testing.T) {
	svc := &GatewayService{}

	parsed := &ParsedRequest{
		Model:          "claude-sonnet-4-5",
		Stream:         true,
		MetadataUserID: "",
	}

	account := &Account{
		ID:   123,
		Type: AccountTypeOAuth,
		Extra: map[string]any{
			"account_uuid":   "acc-uuid",
			"claude_user_id": "clientid123",
		},
	}

	got := svc.buildOAuthMetadataUserID(parsed, account, nil)
	require.NotEmpty(t, got)

	re := regexp.MustCompile(`^user_clientid123_account_acc-uuid_session_[a-f0-9-]{36}$`)
	require.True(t, re.MatchString(got), "unexpected user_id format: %s", got)
}

func TestSessionUUIDFromSeed_DeterministicAndRFC4122(t *testing.T) {
	seed := "123::session-hash"
	got1 := sessionUUIDFromSeed(seed)
	got2 := sessionUUIDFromSeed(seed)

	require.Equal(t, got1, got2)

	re := regexp.MustCompile(`^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$`)
	require.True(t, re.MatchString(got1), "unexpected UUID format: %s", got1)
}

func TestSessionUUIDFromSeed_EmptySeedReturnsUUID(t *testing.T) {
	got := sessionUUIDFromSeed("")
	re := regexp.MustCompile(`^[a-f0-9-]{36}$`)
	require.True(t, re.MatchString(got), "unexpected UUID format: %s", got)
}
