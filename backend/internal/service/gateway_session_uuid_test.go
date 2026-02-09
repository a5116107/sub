package service

import (
	"regexp"
	"testing"

	"github.com/stretchr/testify/require"
)

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
