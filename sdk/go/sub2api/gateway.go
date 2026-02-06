package sub2api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
)

type GatewayClient struct {
	client *Client
	apiKey string
}

// OpenAIChatMessage is a minimal OpenAI chat message shape for /v1/chat/completions.
// Content can be a string or a multimodal array depending on client needs.
type OpenAIChatMessage struct {
	Role    string `json:"role"`
	Content any    `json:"content"`
	Name    string `json:"name,omitempty"`
}

type OpenAIChatCompletionsRequest struct {
	Model       string              `json:"model"`
	Messages    []OpenAIChatMessage `json:"messages"`
	Stream      bool                `json:"stream,omitempty"`
	Temperature *float64            `json:"temperature,omitempty"`
	TopP        *float64            `json:"top_p,omitempty"`
	MaxTokens   *int                `json:"max_tokens,omitempty"`
	Metadata    map[string]any      `json:"metadata,omitempty"`
}

type OpenAIChatCompletionsResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Index   int `json:"index"`
		Message struct {
			Role    string `json:"role"`
			Content any    `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason,omitempty"`
	} `json:"choices"`
	Usage map[string]any `json:"usage,omitempty"`
}

func (g *GatewayClient) ChatCompletions(ctx context.Context, req *OpenAIChatCompletionsRequest) (*OpenAIChatCompletionsResponse, error) {
	if g == nil || g.client == nil {
		return nil, errors.New("client not initialized")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}
	if strings.TrimSpace(req.Model) == "" {
		return nil, errors.New("model is required")
	}
	if req.Stream {
		return nil, errors.New("streaming is not supported by this method; use ChatCompletionsStream")
	}

	payload, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}
	headers := make(http.Header)
	headers.Set("Accept", "application/json")
	headers.Set("Content-Type", "application/json")
	headers.Set("Authorization", bearerAuthHeader(g.apiKey))

	status, _, body, err := g.client.do(ctx, http.MethodPost, "/v1/chat/completions", nil, headers, payload)
	if err != nil {
		return nil, err
	}
	if status < 200 || status >= 300 {
		return nil, &HTTPError{Status: status, Body: body}
	}
	var out OpenAIChatCompletionsResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (g *GatewayClient) ChatCompletionsStream(ctx context.Context, req *OpenAIChatCompletionsRequest) (*http.Response, error) {
	if g == nil || g.client == nil {
		return nil, errors.New("client not initialized")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}
	if strings.TrimSpace(req.Model) == "" {
		return nil, errors.New("model is required")
	}
	copyReq := *req
	copyReq.Stream = true
	payload, err := json.Marshal(copyReq)
	if err != nil {
		return nil, err
	}
	headers := make(http.Header)
	headers.Set("Accept", "text/event-stream")
	headers.Set("Content-Type", "application/json")
	headers.Set("Authorization", bearerAuthHeader(g.apiKey))
	return g.client.doStream(ctx, http.MethodPost, "/v1/chat/completions", nil, headers, payload)
}

// ClaudeMessage is a minimal Claude/Anthropic message shape for /v1/messages.
// Content is typically an array of blocks; keep as any to allow tools/multimodal.
type ClaudeMessage struct {
	Role    string `json:"role"`
	Content any    `json:"content"`
}

type ClaudeMessagesRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens,omitempty"`
	Stream    bool            `json:"stream,omitempty"`
	System    any             `json:"system,omitempty"`
	Messages  []ClaudeMessage `json:"messages"`
	Metadata  map[string]any  `json:"metadata,omitempty"`
}

type ClaudeMessagesResponse struct {
	ID         string         `json:"id"`
	Type       string         `json:"type"`
	Role       string         `json:"role,omitempty"`
	Model      string         `json:"model,omitempty"`
	StopReason string         `json:"stop_reason,omitempty"`
	Content    any            `json:"content,omitempty"`
	Usage      map[string]any `json:"usage,omitempty"`
}

func (g *GatewayClient) ClaudeMessages(ctx context.Context, req *ClaudeMessagesRequest) (*ClaudeMessagesResponse, error) {
	if g == nil || g.client == nil {
		return nil, errors.New("client not initialized")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}
	if strings.TrimSpace(req.Model) == "" {
		return nil, errors.New("model is required")
	}
	if req.Stream {
		return nil, errors.New("streaming is not supported by this method; use ClaudeMessagesStream")
	}

	payload, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}
	headers := make(http.Header)
	headers.Set("Accept", "application/json")
	headers.Set("Content-Type", "application/json")
	headers.Set("Authorization", bearerAuthHeader(g.apiKey))

	status, _, body, err := g.client.do(ctx, http.MethodPost, "/v1/messages", nil, headers, payload)
	if err != nil {
		return nil, err
	}
	if status < 200 || status >= 300 {
		return nil, &HTTPError{Status: status, Body: body}
	}
	var out ClaudeMessagesResponse
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (g *GatewayClient) ClaudeMessagesStream(ctx context.Context, req *ClaudeMessagesRequest) (*http.Response, error) {
	if g == nil || g.client == nil {
		return nil, errors.New("client not initialized")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}
	if strings.TrimSpace(req.Model) == "" {
		return nil, errors.New("model is required")
	}
	copyReq := *req
	copyReq.Stream = true
	payload, err := json.Marshal(copyReq)
	if err != nil {
		return nil, err
	}
	headers := make(http.Header)
	headers.Set("Accept", "text/event-stream")
	headers.Set("Content-Type", "application/json")
	headers.Set("Authorization", bearerAuthHeader(g.apiKey))
	return g.client.doStream(ctx, http.MethodPost, "/v1/messages", nil, headers, payload)
}

// GeminiGenerateContent calls:
// POST /v1beta/models/{model}:generateContent
func (g *GatewayClient) GeminiGenerateContent(ctx context.Context, model string, request any) (json.RawMessage, error) {
	return g.geminiCall(ctx, model, "generateContent", nil, request, false)
}

// GeminiStreamGenerateContent calls:
// POST /v1beta/models/{model}:streamGenerateContent?alt=sse
func (g *GatewayClient) GeminiStreamGenerateContent(ctx context.Context, model string, request any) (*http.Response, error) {
	model = strings.TrimSpace(model)
	if model == "" {
		return nil, errors.New("model is required")
	}
	payload, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}
	headers := make(http.Header)
	headers.Set("Accept", "text/event-stream")
	headers.Set("Content-Type", "application/json")
	headers.Set("Authorization", bearerAuthHeader(g.apiKey))
	q := url.Values{}
	q.Set("alt", "sse")
	return g.client.doStream(ctx, http.MethodPost, "/v1beta/models/"+url.PathEscape(model)+":streamGenerateContent", q, headers, payload)
}

func (g *GatewayClient) geminiCall(ctx context.Context, model, action string, query url.Values, request any, stream bool) (json.RawMessage, error) {
	if g == nil || g.client == nil {
		return nil, errors.New("client not initialized")
	}
	model = strings.TrimSpace(model)
	if model == "" {
		return nil, errors.New("model is required")
	}
	action = strings.TrimSpace(action)
	if action == "" {
		return nil, errors.New("action is required")
	}
	if stream {
		return nil, errors.New("streaming not supported by this method")
	}

	payload, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}
	headers := make(http.Header)
	headers.Set("Accept", "application/json")
	headers.Set("Content-Type", "application/json")
	headers.Set("Authorization", bearerAuthHeader(g.apiKey))

	path := "/v1beta/models/" + url.PathEscape(model) + ":" + action
	status, _, body, err := g.client.do(ctx, http.MethodPost, path, query, headers, payload)
	if err != nil {
		return nil, err
	}
	if status < 200 || status >= 300 {
		return nil, &HTTPError{Status: status, Body: body}
	}
	return json.RawMessage(body), nil
}
