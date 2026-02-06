package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/ctxkey"
	"github.com/Wei-Shaw/sub2api/internal/pkg/ip"
	"github.com/Wei-Shaw/sub2api/internal/pkg/openai"
	middleware2 "github.com/Wei-Shaw/sub2api/internal/server/middleware"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/Wei-Shaw/sub2api/internal/service/payloadrules"

	"github.com/gin-gonic/gin"
)

// ChatCompletions handles OpenAI Chat Completions compatibility endpoint
// POST /v1/chat/completions
func (h *OpenAIGatewayHandler) ChatCompletions(c *gin.Context) {
	h.handleOpenAICompatEndpoint(c, openaiCompatKindChatCompletions)
}

// Completions handles OpenAI legacy Completions compatibility endpoint
// POST /v1/completions
func (h *OpenAIGatewayHandler) Completions(c *gin.Context) {
	h.handleOpenAICompatEndpoint(c, openaiCompatKindCompletions)
}

type openaiCompatKind string

const (
	openaiCompatKindChatCompletions openaiCompatKind = "chat.completions"
	openaiCompatKindCompletions     openaiCompatKind = "completions"
)

func (h *OpenAIGatewayHandler) handleOpenAICompatEndpoint(c *gin.Context, kind openaiCompatKind) {
	// Get apiKey and user from context (set by ApiKeyAuth middleware)
	apiKey, ok := middleware2.GetAPIKeyFromContext(c)
	if !ok {
		h.errorResponse(c, http.StatusUnauthorized, "authentication_error", "Invalid API key")
		return
	}

	subject, ok := middleware2.GetAuthSubjectFromContext(c)
	if !ok {
		h.errorResponse(c, http.StatusInternalServerError, "api_error", "User context not found")
		return
	}

	// Read request body
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		if maxErr, ok := extractMaxBytesError(err); ok {
			h.errorResponse(c, http.StatusRequestEntityTooLarge, "invalid_request_error", buildBodyTooLargeMessage(maxErr.Limit))
			return
		}
		h.errorResponse(c, http.StatusBadRequest, "invalid_request_error", "Failed to read request body")
		return
	}
	if len(body) == 0 {
		h.errorResponse(c, http.StatusBadRequest, "invalid_request_error", "Request body is empty")
		return
	}

	setOpsRequestContext(c, "", false, body)

	var reqBody map[string]any
	if err := json.Unmarshal(body, &reqBody); err != nil {
		h.errorResponse(c, http.StatusBadRequest, "invalid_request_error", "Failed to parse request body")
		return
	}

	platform := service.PlatformOpenAI
	if apiKey.Group != nil {
		if p := strings.TrimSpace(apiKey.Group.Platform); p != "" {
			platform = p
		}
	}

	// Get subscription info (may be nil)
	subscription, _ := middleware2.GetSubscriptionFromContext(c)

	switch platform {
	case service.PlatformOpenAI:
		var responsesReq map[string]any
		var reqModel string
		var reqStream bool
		switch kind {
		case openaiCompatKindChatCompletions:
			responsesReq, reqModel, reqStream, err = openai.ChatCompletionsRequestToResponsesPayload(reqBody)
		case openaiCompatKindCompletions:
			responsesReq, reqModel, reqStream, err = openai.CompletionsRequestToResponsesPayload(reqBody)
		default:
			h.errorResponse(c, http.StatusNotFound, "invalid_request_error", "Unsupported endpoint")
			return
		}
		if err != nil {
			h.errorResponse(c, http.StatusBadRequest, "invalid_request_error", err.Error())
			return
		}

		// Preserve default instructions behavior (non-Codex CLI requests only).
		userAgent := c.GetHeader("User-Agent")
		if !openai.IsCodexCLIRequest(userAgent) {
			existingInstructions, _ := responsesReq["instructions"].(string)
			if strings.TrimSpace(existingInstructions) == "" {
				if instructions := strings.TrimSpace(service.GetOpenCodeInstructions()); instructions != "" {
					responsesReq["instructions"] = instructions
				}
			}
		}

		// Marshal the converted Responses request
		responsesBody, err := json.Marshal(responsesReq)
		if err != nil {
			h.errorResponse(c, http.StatusInternalServerError, "api_error", "Failed to process request")
			return
		}
		setOpsRequestContext(c, reqModel, reqStream, responsesBody)

		// Validate tool continuation context (same guard as /v1/responses).
		if service.HasFunctionCallOutput(responsesReq) {
			previousResponseID, _ := responsesReq["previous_response_id"].(string)
			if strings.TrimSpace(previousResponseID) == "" && !service.HasToolCallContext(responsesReq) {
				if service.HasFunctionCallOutputMissingCallID(responsesReq) {
					log.Printf("[OpenAI Compat] function_call_output missing call_id: model=%s", reqModel)
					h.errorResponse(c, http.StatusBadRequest, "invalid_request_error", "function_call_output requires call_id or previous_response_id; if relying on history, ensure store=true and reuse previous_response_id")
					return
				}
				callIDs := service.FunctionCallOutputCallIDs(responsesReq)
				if !service.HasItemReferenceForCallIDs(responsesReq, callIDs) {
					log.Printf("[OpenAI Compat] function_call_output missing item_reference: model=%s", reqModel)
					h.errorResponse(c, http.StatusBadRequest, "invalid_request_error", "function_call_output requires item_reference ids matching each call_id, or previous_response_id/tool_call context; if relying on history, ensure store=true and reuse previous_response_id")
					return
				}
			}
		}

		origWriter := c.Writer

		if reqStream {
			// Streaming: transform Responses SSE -> Chat/Completions SSE on the fly.
			var mode openai.CompatStreamMode
			if kind == openaiCompatKindCompletions {
				mode = openai.CompatStreamModeCompletions
			} else {
				mode = openai.CompatStreamModeChatCompletions
			}
			c.Writer = &openAICompatSSEWriter{
				ResponseWriter: origWriter,
				transformer:    openai.NewResponseStreamCompatTransformer(mode),
			}

			result, account, reservedUSD := h.forwardWithFailover(c, apiKey, subject, subscription, service.PlatformOpenAI, payloadrules.ProtocolOpenAIResponses, reqModel, reqStream, responsesReq, responsesBody, func(ctx context.Context, c *gin.Context, account *service.Account, _ string, _ bool, body []byte) (*service.OpenAIForwardResult, error) {
				return h.gatewayService.Forward(ctx, c, account, body)
			})
			if result == nil || account == nil {
				return
			}
			h.asyncRecordUsage(result, apiKey, account, subscription, c, reservedUSD)
			return
		}

		// Non-streaming: capture Responses JSON, then rewrite to compat response.
		capture := &openAICompatCaptureWriter{ResponseWriter: origWriter}
		c.Writer = capture

		result, account, reservedUSD := h.forwardWithFailover(c, apiKey, subject, subscription, service.PlatformOpenAI, payloadrules.ProtocolOpenAIResponses, reqModel, reqStream, responsesReq, responsesBody, func(ctx context.Context, c *gin.Context, account *service.Account, _ string, _ bool, body []byte) (*service.OpenAIForwardResult, error) {
			return h.gatewayService.Forward(ctx, c, account, body)
		})

		// Restore writer for final output.
		c.Writer = origWriter

		status := origWriter.Status()
		raw := capture.body.Bytes()

		// If upstream already wrote an error response (or forward failed), passthrough.
		if result == nil || account == nil || status >= 400 {
			if len(raw) > 0 {
				_, _ = origWriter.Write(raw)
			}
			return
		}

		var rewritten []byte
		switch kind {
		case openaiCompatKindChatCompletions:
			rewritten, err = openai.ResponsesBodyToChatCompletionsResponse(raw)
		case openaiCompatKindCompletions:
			rewritten, err = openai.ResponsesBodyToCompletionsResponse(raw)
		default:
			err = errors.New("unsupported endpoint")
		}
		if err != nil {
			// Fallback: passthrough Responses body if conversion fails.
			_, _ = origWriter.Write(raw)
			return
		}

		// Ensure JSON content type for compat responses.
		origWriter.Header().Set("Content-Type", "application/json")
		_, _ = origWriter.Write(rewritten)

		h.asyncRecordUsage(result, apiKey, account, subscription, c, reservedUSD)
		return
	case service.PlatformQwen:
		var chatReq map[string]any
		var reqModel string
		var reqStream bool

		switch kind {
		case openaiCompatKindChatCompletions:
			chatReq = reqBody
			reqModel, _ = reqBody["model"].(string)
			reqModel = strings.TrimSpace(reqModel)
			reqStream, _ = reqBody["stream"].(bool)
			if reqModel == "" {
				h.errorResponse(c, http.StatusBadRequest, "invalid_request_error", "model is required")
				return
			}
		case openaiCompatKindCompletions:
			chatReq, reqModel, reqStream, err = openai.CompletionsRequestToChatCompletionsPayload(reqBody)
			if err != nil {
				h.errorResponse(c, http.StatusBadRequest, "invalid_request_error", err.Error())
				return
			}
		default:
			h.errorResponse(c, http.StatusNotFound, "invalid_request_error", "Unsupported endpoint")
			return
		}

		chatBody, err := json.Marshal(chatReq)
		if err != nil {
			h.errorResponse(c, http.StatusInternalServerError, "api_error", "Failed to process request")
			return
		}
		setOpsRequestContext(c, reqModel, reqStream, chatBody)

		forwarder := func(ctx context.Context, c *gin.Context, account *service.Account, requestedModel string, stream bool, body []byte) (*service.OpenAIForwardResult, error) {
			if h.qwenGatewayService == nil {
				return nil, errors.New("qwen gateway service not configured")
			}
			return h.qwenGatewayService.ForwardChatCompletions(ctx, c, account, requestedModel, stream, body)
		}

		origWriter := c.Writer
		if kind == openaiCompatKindCompletions {
			if reqStream {
				// Streaming: transform Chat Completions SSE -> Completions SSE on the fly.
				c.Writer = &openAICompatSSEWriter{
					ResponseWriter: origWriter,
					transformer:    openai.NewChatCompletionsToCompletionsStreamTransformer(),
				}

				result, account, reservedUSD := h.forwardWithFailover(c, apiKey, subject, subscription, service.PlatformQwen, payloadrules.ProtocolOpenAIChatCompletions, reqModel, reqStream, chatReq, chatBody, forwarder)
				if result == nil || account == nil {
					return
				}
				h.asyncRecordUsage(result, apiKey, account, subscription, c, reservedUSD)
				return
			}

			// Non-streaming: capture Chat Completions JSON, then rewrite to legacy Completions response.
			capture := &openAICompatCaptureWriter{ResponseWriter: origWriter}
			c.Writer = capture

			result, account, reservedUSD := h.forwardWithFailover(c, apiKey, subject, subscription, service.PlatformQwen, payloadrules.ProtocolOpenAIChatCompletions, reqModel, reqStream, chatReq, chatBody, forwarder)

			// Restore writer for final output.
			c.Writer = origWriter

			status := origWriter.Status()
			raw := capture.body.Bytes()

			// If upstream already wrote an error response (or forward failed), passthrough.
			if result == nil || account == nil || status >= 400 {
				if len(raw) > 0 {
					_, _ = origWriter.Write(raw)
				}
				return
			}

			rewritten, err := openai.ChatCompletionsBodyToCompletionsResponse(raw)
			if err != nil {
				// Fallback: passthrough chat completion response.
				_, _ = origWriter.Write(raw)
				return
			}

			origWriter.Header().Set("Content-Type", "application/json")
			_, _ = origWriter.Write(rewritten)

			h.asyncRecordUsage(result, apiKey, account, subscription, c, reservedUSD)
			return
		}

		// Chat Completions: passthrough upstream response as-is.
		result, account, reservedUSD := h.forwardWithFailover(c, apiKey, subject, subscription, service.PlatformQwen, payloadrules.ProtocolOpenAIChatCompletions, reqModel, reqStream, chatReq, chatBody, forwarder)
		if result == nil || account == nil {
			return
		}
		h.asyncRecordUsage(result, apiKey, account, subscription, c, reservedUSD)
		return
	case service.PlatformIFlow:
		var chatReq map[string]any
		var reqModel string
		var reqStream bool

		switch kind {
		case openaiCompatKindChatCompletions:
			chatReq = reqBody
			reqModel, _ = reqBody["model"].(string)
			reqModel = strings.TrimSpace(reqModel)
			reqStream, _ = reqBody["stream"].(bool)
			if reqModel == "" {
				h.errorResponse(c, http.StatusBadRequest, "invalid_request_error", "model is required")
				return
			}
		case openaiCompatKindCompletions:
			chatReq, reqModel, reqStream, err = openai.CompletionsRequestToChatCompletionsPayload(reqBody)
			if err != nil {
				h.errorResponse(c, http.StatusBadRequest, "invalid_request_error", err.Error())
				return
			}
		default:
			h.errorResponse(c, http.StatusNotFound, "invalid_request_error", "Unsupported endpoint")
			return
		}

		chatBody, err := json.Marshal(chatReq)
		if err != nil {
			h.errorResponse(c, http.StatusInternalServerError, "api_error", "Failed to process request")
			return
		}
		setOpsRequestContext(c, reqModel, reqStream, chatBody)

		forwarder := func(ctx context.Context, c *gin.Context, account *service.Account, requestedModel string, stream bool, body []byte) (*service.OpenAIForwardResult, error) {
			if h.iflowGatewayService == nil {
				return nil, errors.New("iflow gateway service not configured")
			}
			return h.iflowGatewayService.ForwardChatCompletions(ctx, c, account, requestedModel, stream, body)
		}

		origWriter := c.Writer
		if kind == openaiCompatKindCompletions {
			if reqStream {
				// Streaming: transform Chat Completions SSE -> Completions SSE on the fly.
				c.Writer = &openAICompatSSEWriter{
					ResponseWriter: origWriter,
					transformer:    openai.NewChatCompletionsToCompletionsStreamTransformer(),
				}

				result, account, reservedUSD := h.forwardWithFailover(c, apiKey, subject, subscription, service.PlatformIFlow, payloadrules.ProtocolOpenAIChatCompletions, reqModel, reqStream, chatReq, chatBody, forwarder)
				if result == nil || account == nil {
					return
				}
				h.asyncRecordUsage(result, apiKey, account, subscription, c, reservedUSD)
				return
			}

			// Non-streaming: capture Chat Completions JSON, then rewrite to legacy Completions response.
			capture := &openAICompatCaptureWriter{ResponseWriter: origWriter}
			c.Writer = capture

			result, account, reservedUSD := h.forwardWithFailover(c, apiKey, subject, subscription, service.PlatformIFlow, payloadrules.ProtocolOpenAIChatCompletions, reqModel, reqStream, chatReq, chatBody, forwarder)

			// Restore writer for final output.
			c.Writer = origWriter

			status := origWriter.Status()
			raw := capture.body.Bytes()

			// If upstream already wrote an error response (or forward failed), passthrough.
			if result == nil || account == nil || status >= 400 {
				if len(raw) > 0 {
					_, _ = origWriter.Write(raw)
				}
				return
			}

			rewritten, err := openai.ChatCompletionsBodyToCompletionsResponse(raw)
			if err != nil {
				// Fallback: passthrough chat completion response.
				_, _ = origWriter.Write(raw)
				return
			}

			origWriter.Header().Set("Content-Type", "application/json")
			_, _ = origWriter.Write(rewritten)

			h.asyncRecordUsage(result, apiKey, account, subscription, c, reservedUSD)
			return
		}

		// Chat Completions: passthrough upstream response as-is.
		result, account, reservedUSD := h.forwardWithFailover(c, apiKey, subject, subscription, service.PlatformIFlow, payloadrules.ProtocolOpenAIChatCompletions, reqModel, reqStream, chatReq, chatBody, forwarder)
		if result == nil || account == nil {
			return
		}
		h.asyncRecordUsage(result, apiKey, account, subscription, c, reservedUSD)
		return
	default:
		h.errorResponse(c, http.StatusBadRequest, "invalid_request_error", "This endpoint is not supported for platform="+platform)
		return
	}
}

func (h *OpenAIGatewayHandler) asyncRecordUsage(
	result *service.OpenAIForwardResult,
	apiKey *service.APIKey,
	account *service.Account,
	subscription *service.UserSubscription,
	c *gin.Context,
	reservedUSD float64,
) {
	clientUA := c.GetHeader("User-Agent")
	clientIP := ip.GetClientIP(c)
	clientRequestID, _ := c.Request.Context().Value(ctxkey.ClientRequestID).(string)
	go func(result *service.OpenAIForwardResult, usedAccount *service.Account, ua, ip, clientRequestID string, reservedUSD float64) {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if strings.TrimSpace(clientRequestID) != "" {
			ctx = context.WithValue(ctx, ctxkey.ClientRequestID, strings.TrimSpace(clientRequestID))
		}
		if err := h.gatewayService.RecordUsage(ctx, &service.OpenAIRecordUsageInput{
			Result:       result,
			APIKey:       apiKey,
			User:         apiKey.User,
			Account:      usedAccount,
			Subscription: subscription,
			UserAgent:    ua,
			IPAddress:    ip,
			ReservedUSD:  reservedUSD,
		}); err != nil {
			log.Printf("Record usage failed: %v", err)
		}
	}(result, account, clientUA, clientIP, clientRequestID, reservedUSD)
}

// openAICompatCaptureWriter captures response body without sending it, while still allowing headers/status
// to be written to the underlying writer.
type openAICompatCaptureWriter struct {
	gin.ResponseWriter
	body bytes.Buffer
}

func (w *openAICompatCaptureWriter) Write(p []byte) (int, error) {
	return w.body.Write(p)
}

func (w *openAICompatCaptureWriter) WriteString(s string) (int, error) {
	return w.body.WriteString(s)
}

type sseDataTransformer interface {
	HandleData(data string) (payloads []string, done bool)
}

// openAICompatSSEWriter transforms Responses SSE lines into compat SSE lines.
type openAICompatSSEWriter struct {
	gin.ResponseWriter
	transformer sseDataTransformer

	pending []byte
	rawMode bool
	sseMode bool
}

func (w *openAICompatSSEWriter) Write(p []byte) (int, error) {
	if w.rawMode {
		_, err := w.ResponseWriter.Write(p)
		return len(p), err
	}

	w.pending = append(w.pending, p...)

	if !w.sseMode {
		trimmed := bytes.TrimLeft(w.pending, " \t\r\n")
		if len(trimmed) > 0 {
			switch trimmed[0] {
			case '{', '[':
				// Probably JSON error response; passthrough as-is.
				w.rawMode = true
				_, err := w.ResponseWriter.Write(w.pending)
				w.pending = nil
				return len(p), err
			case 'd', 'e', ':':
				// data:/event:/keepalive
				w.sseMode = true
			}
		}
	}

	for {
		idx := bytes.IndexByte(w.pending, '\n')
		if idx < 0 {
			break
		}
		line := string(w.pending[:idx])
		line = strings.TrimRight(line, "\r")
		w.pending = w.pending[idx+1:]
		if err := w.handleLine(line); err != nil {
			return len(p), err
		}
	}

	return len(p), nil
}

func (w *openAICompatSSEWriter) WriteString(s string) (int, error) {
	return w.Write([]byte(s))
}

func (w *openAICompatSSEWriter) handleLine(line string) error {
	// Preserve keepalive comments.
	if strings.HasPrefix(line, ":") {
		_, err := w.ResponseWriter.Write([]byte(":\n\n"))
		if err == nil {
			w.Flush()
		}
		return err
	}

	// Preserve error event marker if present.
	if strings.HasPrefix(line, "event:") {
		if strings.HasPrefix(strings.TrimSpace(line), "event: error") {
			_, err := w.ResponseWriter.Write([]byte(line + "\n"))
			if err == nil {
				w.Flush()
			}
			return err
		}
		// Drop other event markers.
		return nil
	}

	if strings.HasPrefix(line, "data:") {
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		// Passthrough structured error payloads.
		if strings.HasPrefix(data, "{") && strings.Contains(data, "\"error\"") {
			_, err := w.ResponseWriter.Write([]byte("data: " + data + "\n\n"))
			if err == nil {
				w.Flush()
			}
			return err
		}

		if w.transformer == nil {
			_, err := w.ResponseWriter.Write([]byte("data: " + data + "\n\n"))
			if err == nil {
				w.Flush()
			}
			return err
		}

		outPayloads, _ := w.transformer.HandleData(data)
		for _, out := range outPayloads {
			_, err := w.ResponseWriter.Write([]byte("data: " + out + "\n\n"))
			if err != nil {
				return err
			}
			w.Flush()
		}
		return nil
	}

	// Ignore other lines (blank lines, etc).
	return nil
}
