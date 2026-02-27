package service

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/util/responseheaders"
	"github.com/Wei-Shaw/sub2api/internal/util/urlvalidator"

	"github.com/gin-gonic/gin"
)

const (
	iflowDefaultBaseURL = "https://apis.iflow.cn/v1"
	iflowDefaultPath    = "/chat/completions"
	iflowUserAgent      = "iFlow-Cli"
)

// IFlowGatewayService forwards OpenAI-compatible Chat Completions requests to iFlow.
// MVP: API key accounts only.
type IFlowGatewayService struct {
	httpUpstream HTTPUpstream
	cfg          *config.Config
}

func NewIFlowGatewayService(httpUpstream HTTPUpstream, cfg *config.Config) *IFlowGatewayService {
	return &IFlowGatewayService{
		httpUpstream: httpUpstream,
		cfg:          cfg,
	}
}

func (s *IFlowGatewayService) validateUpstreamBaseURL(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		raw = iflowDefaultBaseURL
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
		AllowedHosts:     chooseAllowlist(s.cfg.Security.URLAllowlist.IFlowHosts, s.cfg.Security.URLAllowlist.UpstreamHosts),
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

func (s *IFlowGatewayService) getAPIKey(account *Account) (string, error) {
	if account == nil {
		return "", errors.New("account is nil")
	}
	if account.Platform != PlatformIFlow {
		return "", errors.New("not an iflow account")
	}
	if account.Type != AccountTypeAPIKey {
		return "", fmt.Errorf("unsupported iflow account type: %s", account.Type)
	}

	apiKey := strings.TrimSpace(account.GetCredential("api_key"))
	if apiKey == "" {
		return "", errors.New("missing api_key")
	}
	return apiKey, nil
}

// ForwardChatCompletions forwards an OpenAI chat completions request to iFlow.
// It writes the upstream response to the gin context and returns a result for billing/usage.
func (s *IFlowGatewayService) ForwardChatCompletions(ctx context.Context, c *gin.Context, account *Account, requestedModel string, stream bool, body []byte) (*OpenAIForwardResult, error) {
	startTime := time.Now()

	if account == nil {
		return nil, errors.New("account is nil")
	}
	if account.Platform != PlatformIFlow {
		return nil, errors.New("account is not iflow platform")
	}
	if s.httpUpstream == nil {
		return nil, errors.New("http upstream not configured")
	}
	if len(body) == 0 {
		return nil, errors.New("request body is empty")
	}

	apiKey, err := s.getAPIKey(account)
	if err != nil {
		return nil, err
	}

	baseURL := account.GetCredential("base_url")
	validatedURL, err := s.validateUpstreamBaseURL(baseURL)
	if err != nil {
		return nil, err
	}
	targetURL := strings.TrimRight(validatedURL, "/") + iflowDefaultPath

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

	// Some providers choke on `tools: []` - treat empty tools as unset.
	if tools, ok := reqObj["tools"].([]any); ok && len(tools) == 0 {
		delete(reqObj, "tools")
	}

	// Ensure streaming usage is included for billing (if upstream supports it).
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
	upstreamReq.Header.Set("Authorization", "Bearer "+apiKey)
	upstreamReq.Header.Set("User-Agent", iflowUserAgent)
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
			return nil, &UpstreamFailoverError{StatusCode: resp.StatusCode, ResponseBody: respBody}
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
