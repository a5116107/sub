//go:build unit

package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

type stubAntigravitySSEUpstream struct {
	notFoundModel string
}

func (s *stubAntigravitySSEUpstream) Do(req *http.Request, proxyURL string, accountID int64, accountConcurrency int) (*http.Response, error) {
	bodyBytes, _ := io.ReadAll(req.Body)
	_ = req.Body.Close()

	model := ""
	var payload map[string]any
	if err := json.Unmarshal(bodyBytes, &payload); err == nil {
		if v, ok := payload["model"].(string); ok {
			model = v
		}
	}

	if strings.TrimSpace(s.notFoundModel) != "" && model == s.notFoundModel {
		return &http.Response{
			StatusCode: http.StatusNotFound,
			Header:     http.Header{},
			Body:       io.NopCloser(strings.NewReader(`{"error":{"message":"model not found"}}`)),
		}, nil
	}

	// Minimal v1internal SSE payload: one response + DONE.
	sse := strings.Join([]string{
		`data: {"response":{"candidates":[{"content":{"parts":[{"text":"ok"}]}}],"usageMetadata":{"promptTokenCount":1,"candidatesTokenCount":1,"cachedContentTokenCount":0}}}`,
		"",
		"data: [DONE]",
		"",
		"",
	}, "\n")

	return &http.Response{
		StatusCode: http.StatusOK,
		Header:     http.Header{"Content-Type": []string{"text/event-stream"}},
		Body:       io.NopCloser(strings.NewReader(sse)),
	}, nil
}

func (s *stubAntigravitySSEUpstream) DoWithTLS(req *http.Request, proxyURL string, accountID int64, accountConcurrency int, enableTLSFingerprint bool) (*http.Response, error) {
	return s.Do(req, proxyURL, accountID, accountConcurrency)
}

type stubSettingRepoModelFallback struct{}

func (s *stubSettingRepoModelFallback) Get(ctx context.Context, key string) (*Setting, error) {
	return nil, ErrSettingNotFound
}

func (s *stubSettingRepoModelFallback) GetValue(ctx context.Context, key string) (string, error) {
	if key == SettingKeyEnableModelFallback {
		return "true", nil
	}
	return "", ErrSettingNotFound
}

func (s *stubSettingRepoModelFallback) Set(ctx context.Context, key, value string) error {
	return errors.New("not implemented")
}

func (s *stubSettingRepoModelFallback) GetMultiple(ctx context.Context, keys []string) (map[string]string, error) {
	return nil, errors.New("not implemented")
}

func (s *stubSettingRepoModelFallback) SetMultiple(ctx context.Context, settings map[string]string) error {
	return errors.New("not implemented")
}

func (s *stubSettingRepoModelFallback) GetAll(ctx context.Context) (map[string]string, error) {
	return nil, errors.New("not implemented")
}

func (s *stubSettingRepoModelFallback) Delete(ctx context.Context, key string) error {
	return errors.New("not implemented")
}

func TestAntigravityForwardGemini_SetsBilledModelToMappedModel(t *testing.T) {
	gin.SetMode(gin.TestMode)

	upstream := &stubAntigravitySSEUpstream{}
	svc := &AntigravityGatewayService{
		tokenProvider:  &AntigravityTokenProvider{},
		httpUpstream:   upstream,
		settingService: &SettingService{cfg: &config.Config{}},
	}

	account := &Account{
		ID:       1,
		Name:     "acc-1",
		Platform: PlatformAntigravity,
		Type:     AccountTypeOAuth,
		Status:   StatusActive,
		Credentials: map[string]any{
			"access_token": "token",
			"model_mapping": map[string]any{
				"gemini-3-pro-image": "gemini-3.1-flash-image",
			},
		},
		Concurrency: 1,
	}

	body := []byte(`{"contents":[{"role":"user","parts":[{"text":"hi"}]}],"generationConfig":{"imageConfig":{"imageSize":"1K"}}}`)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1beta/models/gemini-3-pro-image:generateContent", bytes.NewReader(body))

	result, err := svc.ForwardGemini(context.Background(), c, account, "gemini-3-pro-image", "generateContent", false, body)
	require.NoError(t, err)
	require.NotNil(t, result)
	require.Equal(t, "gemini-3-pro-image", result.Model)
	require.Equal(t, "gemini-3.1-flash-image", result.BilledModel)
	require.Equal(t, 1, result.ImageCount)
	require.Equal(t, "1K", result.ImageSize)
	require.Equal(t, http.StatusOK, w.Code)
}

func TestAntigravityForwardGemini_FallbackUpdatesBilledModel(t *testing.T) {
	gin.SetMode(gin.TestMode)

	upstream := &stubAntigravitySSEUpstream{
		notFoundModel: "gemini-3.1-flash-image",
	}

	svc := &AntigravityGatewayService{
		tokenProvider:  &AntigravityTokenProvider{},
		httpUpstream:   upstream,
		settingService: NewSettingService(&stubSettingRepoModelFallback{}, &config.Config{}),
	}

	account := &Account{
		ID:       2,
		Name:     "acc-2",
		Platform: PlatformAntigravity,
		Type:     AccountTypeOAuth,
		Status:   StatusActive,
		Credentials: map[string]any{
			"access_token": "token",
			"model_mapping": map[string]any{
				"gemini-3-pro-image": "gemini-3.1-flash-image",
			},
		},
		Concurrency: 1,
	}

	body := []byte(`{"contents":[{"role":"user","parts":[{"text":"hi"}]}]}`)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/v1beta/models/gemini-3-pro-image:generateContent", bytes.NewReader(body))

	result, err := svc.ForwardGemini(context.Background(), c, account, "gemini-3-pro-image", "generateContent", false, body)
	require.NoError(t, err)
	require.NotNil(t, result)
	require.Equal(t, "gemini-3-pro-image", result.Model)
	require.Equal(t, "gemini-2.5-pro", result.BilledModel)
	require.Equal(t, http.StatusOK, w.Code)
}
