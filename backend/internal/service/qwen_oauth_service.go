package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/qwen"
)

// QwenOAuthClient defines the HTTP client operations for Qwen OAuth device flow.
type QwenOAuthClient interface {
	StartDeviceFlow(ctx context.Context, codeChallenge, proxyURL string) (*qwen.DeviceFlowResponse, error)
	PollDeviceToken(ctx context.Context, deviceCode, codeVerifier, proxyURL string) (*qwen.TokenResponse, error)
	RefreshToken(ctx context.Context, refreshToken, proxyURL string) (*qwen.TokenResponse, error)
}

// QwenOAuthService handles Qwen OAuth (device flow) authentication flows.
type QwenOAuthService struct {
	sessionStore *qwen.SessionStore
	proxyRepo    ProxyRepository
	oauthClient  QwenOAuthClient
}

func NewQwenOAuthService(proxyRepo ProxyRepository, oauthClient QwenOAuthClient) *QwenOAuthService {
	return &QwenOAuthService{
		sessionStore: qwen.NewSessionStore(),
		proxyRepo:    proxyRepo,
		oauthClient:  oauthClient,
	}
}

type QwenDeviceFlowResult struct {
	SessionID string `json:"session_id"`

	UserCode                string `json:"user_code"`
	VerificationURI         string `json:"verification_uri"`
	VerificationURIComplete string `json:"verification_uri_complete"`

	ExpiresIn int `json:"expires_in"`
	Interval  int `json:"interval"`
}

// StartDeviceFlow initiates the Qwen OAuth device flow.
func (s *QwenOAuthService) StartDeviceFlow(ctx context.Context, proxyID *int64) (*QwenDeviceFlowResult, error) {
	codeVerifier, err := qwen.GenerateCodeVerifier()
	if err != nil {
		return nil, fmt.Errorf("failed to generate code verifier: %w", err)
	}
	codeChallenge := qwen.GenerateCodeChallenge(codeVerifier)

	// Get proxy URL if specified.
	var proxyURL string
	if proxyID != nil {
		proxy, err := s.proxyRepo.GetByID(ctx, *proxyID)
		if err == nil && proxy != nil {
			proxyURL = proxy.URL()
		}
	}

	resp, err := s.oauthClient.StartDeviceFlow(ctx, codeChallenge, proxyURL)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(resp.DeviceCode) == "" {
		return nil, fmt.Errorf("device authorization failed: device_code not found")
	}

	sessionID, err := qwen.GenerateSessionID()
	if err != nil {
		return nil, fmt.Errorf("failed to generate session ID: %w", err)
	}

	s.sessionStore.Set(sessionID, &qwen.DeviceFlowSession{
		DeviceCode:   resp.DeviceCode,
		CodeVerifier: codeVerifier,
		ProxyURL:     proxyURL,
		CreatedAt:    time.Now(),
	})

	return &QwenDeviceFlowResult{
		SessionID:               sessionID,
		UserCode:                resp.UserCode,
		VerificationURI:         resp.VerificationURI,
		VerificationURIComplete: resp.VerificationURIComplete,
		ExpiresIn:               resp.ExpiresIn,
		Interval:                resp.Interval,
	}, nil
}

type QwenTokenInfo struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	TokenType    string `json:"token_type"`
	ResourceURL  string `json:"resource_url,omitempty"`
	ExpiresIn    int64  `json:"expires_in"`
	ExpiresAt    int64  `json:"expires_at"`
}

// PollDeviceFlowToken polls the token endpoint once for a device flow session.
// Clients should call this repeatedly until the user completes authorization.
func (s *QwenOAuthService) PollDeviceFlowToken(ctx context.Context, sessionID string) (*QwenTokenInfo, error) {
	session, ok := s.sessionStore.Get(sessionID)
	if !ok || session == nil {
		return nil, fmt.Errorf("session not found or expired")
	}

	resp, err := s.oauthClient.PollDeviceToken(ctx, session.DeviceCode, session.CodeVerifier, session.ProxyURL)
	if err != nil {
		return nil, err
	}

	// Delete session after successful exchange.
	s.sessionStore.Delete(sessionID)

	return &QwenTokenInfo{
		AccessToken:  resp.AccessToken,
		RefreshToken: resp.RefreshToken,
		TokenType:    resp.TokenType,
		ResourceURL:  resp.ResourceURL,
		ExpiresIn:    int64(resp.ExpiresIn),
		ExpiresAt:    time.Now().Unix() + int64(resp.ExpiresIn),
	}, nil
}

func (s *QwenOAuthService) RefreshToken(ctx context.Context, refreshToken string, proxyURL string) (*QwenTokenInfo, error) {
	resp, err := s.oauthClient.RefreshToken(ctx, refreshToken, proxyURL)
	if err != nil {
		return nil, err
	}
	return &QwenTokenInfo{
		AccessToken:  resp.AccessToken,
		RefreshToken: resp.RefreshToken,
		TokenType:    resp.TokenType,
		ResourceURL:  resp.ResourceURL,
		ExpiresIn:    int64(resp.ExpiresIn),
		ExpiresAt:    time.Now().Unix() + int64(resp.ExpiresIn),
	}, nil
}

// RefreshAccountToken refreshes token for a specific Qwen account.
func (s *QwenOAuthService) RefreshAccountToken(ctx context.Context, account *Account) (*QwenTokenInfo, error) {
	if account == nil {
		return nil, fmt.Errorf("account is nil")
	}
	if account.Platform != PlatformQwen || account.Type != AccountTypeOAuth {
		return nil, fmt.Errorf("account is not a qwen oauth account")
	}

	refreshToken := strings.TrimSpace(account.GetCredential("refresh_token"))
	if refreshToken == "" {
		return nil, fmt.Errorf("no refresh token available")
	}

	var proxyURL string
	if account.ProxyID != nil {
		if proxy, err := s.proxyRepo.GetByID(ctx, *account.ProxyID); err == nil && proxy != nil {
			proxyURL = proxy.URL()
		}
	}

	return s.RefreshToken(ctx, refreshToken, proxyURL)
}

func (s *QwenOAuthService) BuildAccountCredentials(tokenInfo *QwenTokenInfo) map[string]any {
	expiresAt := time.Unix(tokenInfo.ExpiresAt, 0).Format(time.RFC3339)

	creds := map[string]any{
		"access_token": tokenInfo.AccessToken,
		"expires_at":   expiresAt,
		"token_type":   tokenInfo.TokenType,
		"resource_url": tokenInfo.ResourceURL,
	}
	if tokenInfo.RefreshToken != "" {
		creds["refresh_token"] = tokenInfo.RefreshToken
	}

	// Best-effort normalize base_url for gateway forwarding.
	if strings.TrimSpace(tokenInfo.ResourceURL) != "" {
		creds["base_url"] = fmt.Sprintf("https://%s/v1", strings.TrimSpace(tokenInfo.ResourceURL))
	}

	return creds
}

func (s *QwenOAuthService) Stop() {
	s.sessionStore.Stop()
}
