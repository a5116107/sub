package service

import (
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

func TestTrustedFrontendBaseURL_UsesConfiguredBaseURL_IgnoresSpoofedHeaders(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{}
	cfg.Server.Mode = "release"
	cfg.Server.FrontendBaseURL = "https://good.example.com"

	got, err := TrustedFrontendBaseURL(FrontendBaseURLInput{
		Origin: "https://evil.example.com",
		Host:   "evil.example.com",
		IsTLS:  false,
	}, cfg)
	require.NoError(t, err)
	require.Equal(t, "https://good.example.com", got)
}

func TestTrustedFrontendBaseURL_DebugDerived_RequiresAllowlist(t *testing.T) {
	t.Parallel()

	cfg := &config.Config{}
	cfg.Server.Mode = "debug"
	cfg.Server.DevAllowDerivedFrontendBaseURL = true
	cfg.Server.DevAllowedFrontendHosts = []string{"localhost"}

	got, err := TrustedFrontendBaseURL(FrontendBaseURLInput{
		Origin: "http://localhost:5173",
		Host:   "evil.example.com",
		IsTLS:  false,
	}, cfg)
	require.NoError(t, err)
	require.Equal(t, "http://localhost:5173", got)

	_, err = TrustedFrontendBaseURL(FrontendBaseURLInput{
		Origin: "https://evil.example.com",
		Host:   "evil.example.com",
		IsTLS:  true,
	}, cfg)
	require.Error(t, err)
}
