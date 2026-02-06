package service

import (
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/stretchr/testify/require"
)

func TestIFlowValidateUpstreamBaseURL_RequiresAllowlist(t *testing.T) {
	svc := &IFlowGatewayService{
		cfg: &config.Config{
			Security: config.SecurityConfig{
				URLAllowlist: config.URLAllowlistConfig{
					Enabled:       true,
					UpstreamHosts: []string{"apis.iflow.cn"},
				},
			},
		},
	}

	// non-allowlisted host should fail
	_, err := svc.validateUpstreamBaseURL("https://evil.example.com")
	require.Error(t, err)

	// allowlisted host should pass
	normalized, err := svc.validateUpstreamBaseURL("https://apis.iflow.cn")
	require.NoError(t, err)
	require.Equal(t, "https://apis.iflow.cn", normalized)

	// port/path should be rejected
	_, err = svc.validateUpstreamBaseURL("https://apis.iflow.cn:8443")
	require.Error(t, err)
	_, err = svc.validateUpstreamBaseURL("https://apis.iflow.cn/v1")
	require.Error(t, err)
}

func TestQwenValidateUpstreamBaseURL_RequiresAllowlist(t *testing.T) {
	svc := &QwenGatewayService{
		cfg: &config.Config{
			Security: config.SecurityConfig{
				URLAllowlist: config.URLAllowlistConfig{
					Enabled:       true,
					UpstreamHosts: []string{"portal.qwen.ai"},
				},
			},
		},
	}

	_, err := svc.validateUpstreamBaseURL("https://evil.example.com")
	require.Error(t, err)

	normalized, err := svc.validateUpstreamBaseURL("https://portal.qwen.ai")
	require.NoError(t, err)
	require.Equal(t, "https://portal.qwen.ai", normalized)

	_, err = svc.validateUpstreamBaseURL("https://portal.qwen.ai:8443")
	require.Error(t, err)
	_, err = svc.validateUpstreamBaseURL("https://portal.qwen.ai/v1")
	require.Error(t, err)
}

