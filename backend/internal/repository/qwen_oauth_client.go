package repository

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/qwen"
	"github.com/Wei-Shaw/sub2api/internal/service"

	"github.com/imroc/req/v3"
)

type qwenOAuthClient struct {
	deviceCodeURL string
	tokenURL      string
}

func NewQwenOAuthClient() service.QwenOAuthClient {
	return &qwenOAuthClient{
		deviceCodeURL: qwen.OAuthDeviceCodeURL,
		tokenURL:      qwen.OAuthTokenURL,
	}
}

func (c *qwenOAuthClient) StartDeviceFlow(ctx context.Context, codeChallenge, proxyURL string) (*qwen.DeviceFlowResponse, error) {
	client := createQwenReqClient(proxyURL)

	form := url.Values{}
	form.Set("client_id", qwen.OAuthClientID)
	form.Set("scope", qwen.OAuthScope)
	form.Set("code_challenge", codeChallenge)
	form.Set("code_challenge_method", "S256")

	var out qwen.DeviceFlowResponse
	resp, err := client.R().
		SetContext(ctx).
		SetFormDataFromValues(form).
		SetSuccessResult(&out).
		Post(c.deviceCodeURL)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	if !resp.IsSuccessState() {
		return nil, fmt.Errorf("device authorization failed: status %d, body: %s", resp.StatusCode, resp.String())
	}
	return &out, nil
}

func (c *qwenOAuthClient) PollDeviceToken(ctx context.Context, deviceCode, codeVerifier, proxyURL string) (*qwen.TokenResponse, error) {
	client := createQwenReqClient(proxyURL)

	form := url.Values{}
	form.Set("grant_type", qwen.OAuthGrantType)
	form.Set("client_id", qwen.OAuthClientID)
	form.Set("device_code", deviceCode)
	form.Set("code_verifier", codeVerifier)

	var out qwen.TokenResponse
	resp, err := client.R().
		SetContext(ctx).
		SetFormDataFromValues(form).
		SetSuccessResult(&out).
		Post(c.tokenURL)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	if !resp.IsSuccessState() {
		return nil, fmt.Errorf("device token poll failed: status %d, body: %s", resp.StatusCode, resp.String())
	}
	return &out, nil
}

func (c *qwenOAuthClient) RefreshToken(ctx context.Context, refreshToken, proxyURL string) (*qwen.TokenResponse, error) {
	client := createQwenReqClient(proxyURL)

	form := url.Values{}
	form.Set("grant_type", "refresh_token")
	form.Set("client_id", qwen.OAuthClientID)
	form.Set("refresh_token", refreshToken)

	var out qwen.TokenResponse
	resp, err := client.R().
		SetContext(ctx).
		SetFormDataFromValues(form).
		SetSuccessResult(&out).
		Post(c.tokenURL)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	if !resp.IsSuccessState() {
		return nil, fmt.Errorf("token refresh failed: status %d, body: %s", resp.StatusCode, resp.String())
	}
	return &out, nil
}

func createQwenReqClient(proxyURL string) *req.Client {
	return getSharedReqClient(reqClientOptions{
		ProxyURL: proxyURL,
		Timeout:  60 * time.Second,
	})
}
