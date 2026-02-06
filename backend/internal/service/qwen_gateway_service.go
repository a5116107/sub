package service

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/util/responseheaders"
	"github.com/Wei-Shaw/sub2api/internal/util/urlvalidator"

	"github.com/gin-gonic/gin"
)

const (
	qwenDefaultBaseURL = "https://portal.qwen.ai/v1"

	qwenUserAgent           = "google-api-nodejs-client/9.15.1"
	qwenXGoogAPIClient      = "gl-node/22.17.0"
	qwenClientMetadataValue = "ideType=IDE_UNSPECIFIED,platform=PLATFORM_UNSPECIFIED,pluginType=GEMINI"
)

// QwenGatewayService forwards OpenAI-compatible Chat Completions requests to Qwen.
// It focuses on:
// - POST {base_url}/chat/completions
// - streaming/non-streaming passthrough
// - usage extraction for billing (best-effort, prefers include_usage)
type QwenGatewayService struct {
	accountRepo  AccountRepository
	httpUpstream HTTPUpstream
	cfg          *config.Config

	qwenOAuth *QwenOAuthService
}

func NewQwenGatewayService(
	accountRepo AccountRepository,
	httpUpstream HTTPUpstream,
	cfg *config.Config,
	qwenOAuth *QwenOAuthService,
) *QwenGatewayService {
	return &QwenGatewayService{
		accountRepo:  accountRepo,
		httpUpstream: httpUpstream,
		cfg:          cfg,
		qwenOAuth:    qwenOAuth,
	}
}

func (s *QwenGatewayService) validateUpstreamBaseURL(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		raw = qwenDefaultBaseURL
	}
	if s.cfg == nil || !s.cfg.Security.URLAllowlist.Enabled {
		u, err := urlvalidator.ValidateHTTPSURL(raw, urlvalidator.ValidationOptions{
			AllowPrivate:     false,
			RequireAllowlist: false,
			AllowPorts:       []int{443},
			RequireNoPath:    true,
		})
		if err != nil {
			return "", err
		}
		return u, nil
	}
	u, err := urlvalidator.ValidateHTTPSURL(raw, urlvalidator.ValidationOptions{
		AllowedHosts:     chooseAllowlist(s.cfg.Security.URLAllowlist.QwenHosts, s.cfg.Security.URLAllowlist.UpstreamHosts),
		RequireAllowlist: true,
		AllowPrivate:     s.cfg.Security.URLAllowlist.AllowPrivateHosts,
		AllowPorts:       []int{443},
		RequireNoPath:    true,
	})
	if err != nil {
		return "", err
	}
	return u, nil
}

func (s *QwenGatewayService) getAccessToken(ctx context.Context, account *Account) (string, error) {
	if account == nil {
		return "", errors.New("account is nil")
	}
	if account.Platform != PlatformQwen {
		return "", errors.New("not a qwen account")
	}

	if account.Type == AccountTypeAPIKey {
		token := strings.TrimSpace(account.GetCredential("api_key"))
		if token == "" {
			return "", errors.New("missing api_key")
		}
		return token, nil
	}

	if account.Type != AccountTypeOAuth {
		return "", fmt.Errorf("unsupported qwen account type: %s", account.Type)
	}

	token := strings.TrimSpace(account.GetCredential("access_token"))
	if token == "" {
		return "", errors.New("missing access_token")
	}

	// Best-effort refresh when token is expired/near-expiry and refresh_token exists.
	expiresAt := account.GetCredentialAsTime("expires_at")
	if expiresAt != nil && time.Now().Add(60*time.Second).After(*expiresAt) && s.qwenOAuth != nil {
		refreshToken := strings.TrimSpace(account.GetCredential("refresh_token"))
		if refreshToken != "" {
			tokenInfo, err := s.qwenOAuth.RefreshAccountToken(ctx, account)
			if err != nil {
				log.Printf("[Qwen] Token refresh failed for account %d: %v", account.ID, err)
				return token, nil // fall back to existing token
			}

			newCreds := s.qwenOAuth.BuildAccountCredentials(tokenInfo)
			for k, v := range account.Credentials {
				if _, exists := newCreds[k]; !exists {
					newCreds[k] = v
				}
			}
			account.Credentials = newCreds
			if s.accountRepo != nil {
				if err := s.accountRepo.Update(ctx, account); err != nil {
					log.Printf("[Qwen] Persist refreshed token failed for account %d: %v", account.ID, err)
				}
			}

			if refreshed := strings.TrimSpace(account.GetCredential("access_token")); refreshed != "" {
				token = refreshed
			}
		}
	}

	return token, nil
}

func ensureStreamIncludeUsage(req map[string]any) {
	if req == nil {
		return
	}
	raw, ok := req["stream_options"]
	if m, okMap := raw.(map[string]any); ok && okMap {
		m["include_usage"] = true
		req["stream_options"] = m
		return
	}
	req["stream_options"] = map[string]any{
		"include_usage": true,
	}
}

func writeOpenAIError(c *gin.Context, statusCode int, message string) {
	if c == nil {
		return
	}
	msg := strings.TrimSpace(message)
	if msg == "" {
		msg = "Unknown error"
	}
	c.JSON(statusCode, gin.H{
		"error": gin.H{
			"message": msg,
			"type":    "api_error",
		},
	})
}

func parseChatUsage(v any) *OpenAIUsage {
	raw, ok := v.(map[string]any)
	if !ok || raw == nil {
		return nil
	}
	prompt, _ := raw["prompt_tokens"].(float64)
	completion, _ := raw["completion_tokens"].(float64)
	if prompt == 0 && completion == 0 {
		return nil
	}
	return &OpenAIUsage{
		InputTokens:  int(prompt),
		OutputTokens: int(completion),
	}
}

func parseChatUsageFromBytes(b []byte) *OpenAIUsage {
	var payload map[string]any
	if err := json.Unmarshal(b, &payload); err != nil || payload == nil {
		return nil
	}
	if usage := parseChatUsage(payload["usage"]); usage != nil {
		return usage
	}
	return nil
}

func replaceModelInChatBody(body []byte, model string) []byte {
	if strings.TrimSpace(model) == "" || len(body) == 0 {
		return body
	}
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil || payload == nil {
		return body
	}
	if _, ok := payload["model"].(string); ok {
		payload["model"] = model
		if out, err := json.Marshal(payload); err == nil && len(out) > 0 {
			return out
		}
	}
	return body
}

func replaceModelInChatChunk(line string, model string) (string, *OpenAIUsage, bool) {
	line = strings.TrimRight(line, "\r\n")
	if !strings.HasPrefix(line, "data:") {
		return line, nil, false
	}
	payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
	if payload == "" || payload == "[DONE]" {
		return line, nil, false
	}

	var obj map[string]any
	if err := json.Unmarshal([]byte(payload), &obj); err != nil || obj == nil {
		return line, nil, false
	}

	var usage *OpenAIUsage
	if u := parseChatUsage(obj["usage"]); u != nil {
		usage = u
	}

	if strings.TrimSpace(model) != "" {
		if _, ok := obj["model"].(string); ok {
			obj["model"] = model
		}
	}

	out, err := json.Marshal(obj)
	if err != nil || len(out) == 0 {
		return line, usage, false
	}
	return "data: " + string(out), usage, true
}

func chunkHasDeltaContent(payload map[string]any) bool {
	choices, ok := payload["choices"].([]any)
	if !ok || len(choices) == 0 {
		return false
	}
	first, ok := choices[0].(map[string]any)
	if !ok {
		return false
	}
	delta, ok := first["delta"].(map[string]any)
	if !ok || delta == nil {
		return false
	}
	if c, ok := delta["content"].(string); ok && strings.TrimSpace(c) != "" {
		return true
	}
	return false
}

// ForwardChatCompletions forwards an OpenAI chat completions request to Qwen.
// It writes the upstream response to the gin context and returns a result for billing/usage.
func (s *QwenGatewayService) ForwardChatCompletions(ctx context.Context, c *gin.Context, account *Account, requestedModel string, stream bool, body []byte) (*OpenAIForwardResult, error) {
	startTime := time.Now()

	if account == nil {
		return nil, errors.New("account is nil")
	}
	if account.Platform != PlatformQwen {
		return nil, errors.New("account is not qwen platform")
	}
	if s.httpUpstream == nil {
		return nil, errors.New("http upstream not configured")
	}
	if len(body) == 0 {
		return nil, errors.New("request body is empty")
	}

	token, err := s.getAccessToken(ctx, account)
	if err != nil {
		return nil, err
	}

	baseURL := account.GetCredential("base_url")
	validatedURL, err := s.validateUpstreamBaseURL(baseURL)
	if err != nil {
		return nil, err
	}
	targetURL := strings.TrimRight(validatedURL, "/") + "/chat/completions"

	var reqObj map[string]any
	if err := json.Unmarshal(body, &reqObj); err != nil || reqObj == nil {
		return nil, fmt.Errorf("failed to parse request body: %w", err)
	}

	// Map model if a whitelist/mapping is configured on the account.
	mappedModel := strings.TrimSpace(requestedModel)
	if mapped := strings.TrimSpace(account.GetMappedModel(mappedModel)); mapped != "" {
		mappedModel = mapped
	}
	if mappedModel != "" {
		reqObj["model"] = mappedModel
	}

	// Ensure streaming usage is included for billing.
	if stream {
		ensureStreamIncludeUsage(reqObj)
	}

	encoded, err := json.Marshal(reqObj)
	if err != nil {
		return nil, fmt.Errorf("failed to encode request: %w", err)
	}
	body = encoded

	// Capture upstream request body for ops retry.
	if c != nil {
		c.Set(OpsUpstreamRequestBodyKey, string(body))
	}

	proxyURL := ""
	if account.ProxyID != nil && account.Proxy != nil {
		proxyURL = account.Proxy.URL()
	}

	upstreamReq, err := http.NewRequestWithContext(ctx, http.MethodPost, targetURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	upstreamReq.Header.Set("Content-Type", "application/json")
	upstreamReq.Header.Set("Authorization", "Bearer "+token)
	upstreamReq.Header.Set("User-Agent", qwenUserAgent)
	upstreamReq.Header.Set("X-Goog-Api-Client", qwenXGoogAPIClient)
	upstreamReq.Header.Set("Client-Metadata", qwenClientMetadataValue)
	if stream {
		upstreamReq.Header.Set("Accept", "text/event-stream")
	} else {
		upstreamReq.Header.Set("Accept", "application/json")
	}

	resp, err := s.httpUpstream.Do(upstreamReq, proxyURL, account.ID, account.Concurrency)
	if err != nil {
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return nil, err
		}
		safeErr := sanitizeUpstreamErrorMessage(err.Error())
		appendOpsUpstreamError(c, OpsUpstreamErrorEvent{
			Platform:           account.Platform,
			AccountID:          account.ID,
			AccountName:        account.Name,
			UpstreamStatusCode: 0,
			Kind:               "request_error",
			Message:            safeErr,
		})
		setOpsUpstreamError(c, 0, safeErr, "")
		if strings.TrimSpace(proxyURL) != "" {
			return nil, &UpstreamFailoverError{StatusCode: http.StatusBadGateway}
		}
		if c != nil {
			writeOpenAIError(c, http.StatusBadGateway, "Upstream request failed")
		}
		return nil, fmt.Errorf("upstream request failed: %w", err)
	}
	if resp == nil {
		if c != nil {
			writeOpenAIError(c, http.StatusBadGateway, "Empty upstream response")
		}
		return nil, errors.New("empty upstream response")
	}
	defer func() { _ = resp.Body.Close() }()

	requestID := resp.Header.Get("x-request-id")
	if requestID != "" && c != nil {
		c.Header("x-request-id", requestID)
	}

	// Handle upstream errors (pass-through body; failover on retryable status codes).
	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 8<<20))

		upstreamMsg := strings.TrimSpace(extractUpstreamErrorMessage(respBody))
		upstreamMsg = sanitizeUpstreamErrorMessage(upstreamMsg)
		upstreamDetail := ""
		if s.cfg != nil && s.cfg.Gateway.LogUpstreamErrorBody {
			maxBytes := s.cfg.Gateway.LogUpstreamErrorBodyMaxBytes
			if maxBytes <= 0 {
				maxBytes = 2048
			}
			upstreamDetail = truncateString(string(respBody), maxBytes)
		}

		setOpsUpstreamError(c, resp.StatusCode, upstreamMsg, upstreamDetail)
		appendOpsUpstreamError(c, OpsUpstreamErrorEvent{
			Platform:             account.Platform,
			AccountID:            account.ID,
			AccountName:          account.Name,
			UpstreamStatusCode:   resp.StatusCode,
			UpstreamRequestID:    requestID,
			Kind:                 "http_error",
			Message:              upstreamMsg,
			Detail:               upstreamDetail,
			UpstreamResponseBody: upstreamDetail,
		})

		shouldFailover := resp.StatusCode == http.StatusTooManyRequests ||
			resp.StatusCode == http.StatusBadGateway ||
			resp.StatusCode == http.StatusServiceUnavailable ||
			resp.StatusCode == http.StatusGatewayTimeout ||
			resp.StatusCode >= 500
		if shouldFailover && account.ShouldHandleErrorCode(resp.StatusCode) {
			appendOpsUpstreamError(c, OpsUpstreamErrorEvent{
				Platform:           account.Platform,
				AccountID:          account.ID,
				AccountName:        account.Name,
				UpstreamStatusCode: resp.StatusCode,
				UpstreamRequestID:  requestID,
				Kind:               "failover",
				Message:            upstreamMsg,
				Detail:             upstreamDetail,
			})
			return nil, &UpstreamFailoverError{StatusCode: resp.StatusCode}
		}

		if c != nil {
			if s.cfg != nil {
				responseheaders.WriteFilteredHeaders(c.Writer.Header(), resp.Header, s.cfg.Security.ResponseHeaders)
			}
			contentType := resp.Header.Get("Content-Type")
			if contentType == "" {
				contentType = "application/json"
			}
			c.Data(resp.StatusCode, contentType, respBody)
		}
		return nil, fmt.Errorf("upstream error: %d", resp.StatusCode)
	}

	// Success path.
	result := &OpenAIForwardResult{
		RequestID: requestID,
		Model:     mappedModel,
		Stream:    stream,
	}

	if !stream {
		respBody, err := readAllWithLimit(resp.Body, maxUpstreamNonStreamingBodyBytes)
		if err != nil {
			if c != nil {
				writeOpenAIError(c, http.StatusBadGateway, "Failed to read upstream response")
			}
			return nil, err
		}

		// Rewrite model to requested (for client compatibility), but bill with mapped model.
		if strings.TrimSpace(requestedModel) != "" {
			respBody = replaceModelInChatBody(respBody, requestedModel)
		}
		if usage := parseChatUsageFromBytes(respBody); usage != nil {
			result.Usage = *usage
		}

		if c != nil {
			if s.cfg != nil {
				responseheaders.WriteFilteredHeaders(c.Writer.Header(), resp.Header, s.cfg.Security.ResponseHeaders)
			}
			contentType := resp.Header.Get("Content-Type")
			if contentType == "" {
				contentType = "application/json"
			}
			c.Data(resp.StatusCode, contentType, respBody)
		}

		result.Duration = time.Since(startTime)
		return result, nil
	}

	// Streaming response (SSE).
	if c == nil {
		return nil, errors.New("streaming requires gin context")
	}
	if s.cfg != nil {
		responseheaders.WriteFilteredHeaders(c.Writer.Header(), resp.Header, s.cfg.Security.ResponseHeaders)
	}

	c.Status(resp.StatusCode)
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "text/event-stream; charset=utf-8"
	}
	c.Header("Content-Type", contentType)

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		return nil, errors.New("streaming not supported")
	}

	reader := bufio.NewReader(resp.Body)
	var firstTokenMs *int
	usage := &OpenAIUsage{}

	for {
		line, err := reader.ReadString('\n')
		if len(line) > 0 {
			trimmed := strings.TrimRight(line, "\r\n")
			if strings.HasPrefix(trimmed, "data:") {
				payload := strings.TrimSpace(strings.TrimPrefix(trimmed, "data:"))
				if payload != "" && payload != "[DONE]" {
					var parsed map[string]any
					_ = json.Unmarshal([]byte(payload), &parsed)
					if parsed != nil {
						if u := parseChatUsage(parsed["usage"]); u != nil {
							usage = u
						}
						if firstTokenMs == nil && chunkHasDeltaContent(parsed) {
							ms := int(time.Since(startTime).Milliseconds())
							firstTokenMs = &ms
						}
					}
				}

				rewritten, u, okRewrite := replaceModelInChatChunk(trimmed, requestedModel)
				if u != nil {
					usage = u
				}
				if okRewrite {
					line = rewritten + "\n"
				}
			}

			_, _ = io.WriteString(c.Writer, line)
			flusher.Flush()
		}

		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, err
		}
	}

	result.Usage = *usage
	result.Duration = time.Since(startTime)
	result.FirstTokenMs = firstTokenMs
	return result, nil
}
