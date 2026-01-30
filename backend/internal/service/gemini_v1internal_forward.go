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

	"github.com/Wei-Shaw/sub2api/internal/pkg/geminicli"
	"github.com/Wei-Shaw/sub2api/internal/util/responseheaders"

	"github.com/gin-gonic/gin"
)

func extractGeminiUsageFromV1InternalPayload(payload map[string]any) *ClaudeUsage {
	if payload == nil {
		return nil
	}
	if u := extractGeminiUsage(payload); u != nil {
		return u
	}
	if resp, ok := payload["response"].(map[string]any); ok && resp != nil {
		if u := extractGeminiUsage(resp); u != nil {
			return u
		}
	}
	return nil
}

// ForwardV1Internal proxies Gemini Code Assist (cloudcode-pa) endpoints:
// POST /v1internal:{method}
//
// This is a pass-through endpoint (no unwrap/rewrites) but still captures usage for billing.
func (s *GeminiMessagesCompatService) ForwardV1Internal(ctx context.Context, c *gin.Context, account *Account, method string, stream bool, body []byte) (*ForwardResult, error) {
	startTime := time.Now()

	if account == nil {
		return nil, errors.New("account is nil")
	}
	if account.Platform != PlatformGemini || account.Type != AccountTypeOAuth {
		return nil, errors.New("not a gemini oauth account")
	}
	if s.tokenProvider == nil {
		return nil, errors.New("gemini token provider not configured")
	}

	method = strings.TrimSpace(method)
	if method == "" {
		return nil, s.writeGoogleError(c, http.StatusBadRequest, "Missing method in URL")
	}
	if len(body) == 0 {
		return nil, s.writeGoogleError(c, http.StatusBadRequest, "Request body is empty")
	}

	// Enforce project_id from the selected account to avoid client-controlled project selection.
	projectID := strings.TrimSpace(account.GetCredential("project_id"))
	if projectID == "" {
		return nil, s.writeGoogleError(c, http.StatusBadGateway, "Gemini Code Assist account missing project_id")
	}

	var reqObj map[string]any
	if err := json.Unmarshal(body, &reqObj); err != nil || reqObj == nil {
		return nil, s.writeGoogleError(c, http.StatusBadRequest, "Failed to parse request body")
	}

	model := ""
	if v, ok := reqObj["model"].(string); ok {
		model = strings.TrimSpace(v)
	}
	reqObj["project"] = projectID
	if b, err := json.Marshal(reqObj); err == nil && len(b) > 0 {
		body = b
	}

	accessToken, err := s.tokenProvider.GetAccessToken(ctx, account)
	if err != nil {
		return nil, err
	}

	baseURL, err := s.validateUpstreamBaseURL(geminicli.GeminiCliBaseURL)
	if err != nil {
		return nil, err
	}
	fullURL := fmt.Sprintf("%s/v1internal:%s", strings.TrimRight(baseURL, "/"), method)
	if stream {
		fullURL += "?alt=sse"
	}

	proxyURL := ""
	if account.ProxyID != nil && account.Proxy != nil {
		proxyURL = account.Proxy.URL()
	}

	var resp *http.Response
	for attempt := 1; attempt <= geminiMaxRetries; attempt++ {
		upstreamReq, err := http.NewRequestWithContext(ctx, http.MethodPost, fullURL, bytes.NewReader(body))
		if err != nil {
			return nil, err
		}
		upstreamReq.Header.Set("Content-Type", "application/json")
		upstreamReq.Header.Set("Authorization", "Bearer "+accessToken)
		upstreamReq.Header.Set("User-Agent", geminicli.GeminiCLIUserAgent)

		// Capture upstream request body for ops retry.
		if c != nil {
			c.Set(OpsUpstreamRequestBodyKey, string(body))
		}

		resp, err = s.httpUpstream.Do(upstreamReq, proxyURL, account.ID, account.Concurrency)
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
			if attempt < geminiMaxRetries {
				log.Printf("Gemini v1internal account %d: upstream request failed, retry %d/%d: %v", account.ID, attempt, geminiMaxRetries, err)
				sleepGeminiBackoff(attempt)
				continue
			}
			setOpsUpstreamError(c, 0, safeErr, "")
			if strings.TrimSpace(proxyURL) != "" {
				log.Printf("Gemini v1internal account %d: upstream request error via proxy, triggering failover: %s", account.ID, safeErr)
				return nil, &UpstreamFailoverError{StatusCode: http.StatusBadGateway}
			}
			return nil, s.writeGoogleError(c, http.StatusBadGateway, "Upstream request failed after retries: "+safeErr)
		}

		if resp.StatusCode >= 400 && s.shouldRetryGeminiUpstreamError(account, resp.StatusCode) {
			respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
			_ = resp.Body.Close()
			s.handleGeminiUpstreamError(ctx, account, resp.StatusCode, resp.Header, respBody)
			if attempt < geminiMaxRetries {
				log.Printf("Gemini v1internal account %d: upstream error %d, retry %d/%d", account.ID, resp.StatusCode, attempt, geminiMaxRetries)
				sleepGeminiBackoff(attempt)
				continue
			}
			resp = &http.Response{
				StatusCode: resp.StatusCode,
				Header:     resp.Header.Clone(),
				Body:       io.NopCloser(bytes.NewReader(respBody)),
			}
		}
		break
	}
	if resp == nil {
		return nil, s.writeGoogleError(c, http.StatusBadGateway, "Empty upstream response")
	}
	defer func() { _ = resp.Body.Close() }()

	requestID := resp.Header.Get("x-request-id")
	if requestID == "" {
		requestID = resp.Header.Get("x-goog-request-id")
	}
	if requestID != "" {
		c.Header("x-request-id", requestID)
	}

	// Handle upstream errors (pass-through body; failover on selected status codes).
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
			Platform:           account.Platform,
			AccountID:          account.ID,
			AccountName:        account.Name,
			UpstreamStatusCode: resp.StatusCode,
			UpstreamRequestID:  requestID,
			Kind:               "http_error",
			Message:            upstreamMsg,
			Detail:             upstreamDetail,
			UpstreamResponseBody: func() string {
				if upstreamDetail != "" {
					return upstreamDetail
				}
				if s.cfg != nil && s.cfg.Gateway.LogUpstreamErrorBody {
					return truncateString(string(respBody), 2048)
				}
				return ""
			}(),
		})

		if s.shouldFailoverGeminiUpstreamError(resp.StatusCode) {
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

		if s.cfg != nil {
			responseheaders.WriteFilteredHeaders(c.Writer.Header(), resp.Header, s.cfg.Security.ResponseHeaders)
		}
		contentType := resp.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "application/json"
		}
		c.Data(resp.StatusCode, contentType, respBody)
		return nil, fmt.Errorf("upstream error: %d", resp.StatusCode)
	}

	// Success path.
	var usage *ClaudeUsage
	var firstTokenMs *int

	if stream {
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
		usage = &ClaudeUsage{}

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
							if u := extractGeminiUsageFromV1InternalPayload(parsed); u != nil {
								usage = u
							}
						}
						if firstTokenMs == nil {
							ms := int(time.Since(startTime).Milliseconds())
							firstTokenMs = &ms
						}
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
	} else {
		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, s.writeGoogleError(c, http.StatusBadGateway, "Failed to read response")
		}

		if s.cfg != nil {
			responseheaders.WriteFilteredHeaders(c.Writer.Header(), resp.Header, s.cfg.Security.ResponseHeaders)
		}
		contentType := resp.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "application/json"
		}
		c.Data(resp.StatusCode, contentType, respBody)

		var parsed map[string]any
		if err := json.Unmarshal(respBody, &parsed); err == nil && parsed != nil {
			usage = extractGeminiUsageFromV1InternalPayload(parsed)
		}
	}

	if usage == nil {
		usage = &ClaudeUsage{}
	}

	return &ForwardResult{
		RequestID:    requestID,
		Usage:        *usage,
		Model:        model,
		Stream:       stream,
		Duration:     time.Since(startTime),
		FirstTokenMs: firstTokenMs,
	}, nil
}
