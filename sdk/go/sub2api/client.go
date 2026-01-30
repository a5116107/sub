package sub2api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type RetryConfig struct {
	MaxRetries int
	BaseDelay  time.Duration
	MaxDelay   time.Duration
}

type Client struct {
	baseURL    *url.URL
	httpClient *http.Client
	userAgent  string
	retry      RetryConfig
}

type Option func(*Client)

func WithHTTPClient(httpClient *http.Client) Option {
	return func(c *Client) {
		if httpClient != nil {
			c.httpClient = httpClient
		}
	}
}

func WithUserAgent(userAgent string) Option {
	return func(c *Client) {
		c.userAgent = strings.TrimSpace(userAgent)
	}
}

func WithRetry(cfg RetryConfig) Option {
	return func(c *Client) {
		c.retry = cfg
	}
}

func NewClient(baseURL string, opts ...Option) (*Client, error) {
	baseURL = strings.TrimSpace(baseURL)
	if baseURL == "" {
		return nil, errors.New("baseURL is required")
	}
	parsed, err := url.Parse(baseURL)
	if err != nil {
		return nil, err
	}
	if parsed.Scheme == "" || parsed.Host == "" {
		return nil, errors.New("baseURL must be an absolute URL")
	}
	if parsed.Path == "" {
		parsed.Path = "/"
	}

	c := &Client{
		baseURL:    parsed,
		httpClient: http.DefaultClient,
		userAgent:  "sub2api-go-sdk",
		retry: RetryConfig{
			MaxRetries: 2,
			BaseDelay:  200 * time.Millisecond,
			MaxDelay:   2 * time.Second,
		},
	}
	for _, opt := range opts {
		if opt != nil {
			opt(c)
		}
	}
	return c, nil
}

func (c *Client) Gateway(apiKey string) *GatewayClient {
	return &GatewayClient{client: c, apiKey: strings.TrimSpace(apiKey)}
}

func (c *Client) Admin(token string) *AdminClient {
	return &AdminClient{client: c, token: strings.TrimSpace(token)}
}

func (c *Client) Auth() *AuthClient {
	return &AuthClient{client: c}
}

func (c *Client) newRequest(ctx context.Context, method, path string, query url.Values, body io.Reader) (*http.Request, error) {
	if c == nil || c.baseURL == nil {
		return nil, errors.New("client not initialized")
	}

	u := *c.baseURL
	u.RawQuery = ""

	basePath := strings.TrimRight(u.Path, "/")
	reqPath := strings.TrimLeft(strings.TrimSpace(path), "/")
	if reqPath == "" {
		u.Path = basePath + "/"
	} else {
		u.Path = basePath + "/" + reqPath
	}

	if query != nil {
		u.RawQuery = query.Encode()
	}

	req, err := http.NewRequestWithContext(ctx, method, u.String(), body)
	if err != nil {
		return nil, err
	}
	if ua := strings.TrimSpace(c.userAgent); ua != "" {
		req.Header.Set("User-Agent", ua)
	}
	return req, nil
}

func (c *Client) do(ctx context.Context, method, path string, query url.Values, headers http.Header, body []byte) (status int, respHeaders http.Header, respBody []byte, err error) {
	if c == nil {
		return 0, nil, nil, errors.New("client not initialized")
	}

	// Only retry idempotent GETs.
	shouldRetry := strings.EqualFold(method, http.MethodGet) && c.retry.MaxRetries > 0
	attempts := 1
	if shouldRetry {
		attempts += c.retry.MaxRetries
	}

	var lastErr error
	for i := 0; i < attempts; i++ {
		var bodyReader io.Reader
		if len(body) > 0 {
			bodyReader = bytes.NewReader(body)
		}
		req, reqErr := c.newRequest(ctx, method, path, query, bodyReader)
		if reqErr != nil {
			return 0, nil, nil, reqErr
		}
		for k, vv := range headers {
			for _, v := range vv {
				req.Header.Add(k, v)
			}
		}
		resp, respErr := c.httpClient.Do(req)
		if respErr != nil {
			lastErr = respErr
			if !shouldRetry || i == attempts-1 {
				return 0, nil, nil, respErr
			}
			sleepBackoff(i, c.retry)
			continue
		}
		b, readErr := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		if readErr != nil {
			lastErr = readErr
			if !shouldRetry || i == attempts-1 {
				return resp.StatusCode, resp.Header.Clone(), nil, readErr
			}
			sleepBackoff(i, c.retry)
			continue
		}

		// Retry 5xx for GETs.
		if shouldRetry && resp.StatusCode >= 500 && i < attempts-1 {
			lastErr = &HTTPError{Status: resp.StatusCode, Body: b}
			sleepBackoff(i, c.retry)
			continue
		}

		return resp.StatusCode, resp.Header.Clone(), b, nil
	}

	if lastErr != nil {
		return 0, nil, nil, lastErr
	}
	return 0, nil, nil, errors.New("request failed")
}

func sleepBackoff(attempt int, cfg RetryConfig) {
	base := cfg.BaseDelay
	if base <= 0 {
		base = 200 * time.Millisecond
	}
	max := cfg.MaxDelay
	if max <= 0 {
		max = 2 * time.Second
	}
	d := base * (1 << attempt)
	if d > max {
		d = max
	}
	time.Sleep(d)
}

func doEnvelope[T any](ctx context.Context, c *Client, method, path string, query url.Values, authHeader string, reqBody any) (T, error) {
	var zero T
	if c == nil {
		return zero, errors.New("client not initialized")
	}

	var payload []byte
	var err error
	if reqBody != nil {
		payload, err = json.Marshal(reqBody)
		if err != nil {
			return zero, err
		}
	}

	headers := make(http.Header)
	headers.Set("Accept", "application/json")
	if reqBody != nil {
		headers.Set("Content-Type", "application/json")
	}
	if strings.TrimSpace(authHeader) != "" {
		headers.Set("Authorization", authHeader)
	}

	status, _, body, err := c.do(ctx, method, path, query, headers, payload)
	if err != nil {
		return zero, err
	}

	if status < 200 || status >= 300 {
		var env Envelope[json.RawMessage]
		if json.Unmarshal(body, &env) == nil {
			return zero, &APIError{
				Status:   status,
				Code:     env.Code,
				Message:  env.Message,
				Reason:   env.Reason,
				Metadata: env.Metadata,
				Body:     body,
			}
		}
		return zero, &HTTPError{Status: status, Body: body}
	}

	var env Envelope[T]
	if err := json.Unmarshal(body, &env); err != nil {
		return zero, err
	}
	return env.Data, nil
}

func (c *Client) doStream(ctx context.Context, method, path string, query url.Values, headers http.Header, body []byte) (*http.Response, error) {
	if c == nil {
		return nil, errors.New("client not initialized")
	}
	var bodyReader io.Reader
	if len(body) > 0 {
		bodyReader = bytes.NewReader(body)
	}
	req, err := c.newRequest(ctx, method, path, query, bodyReader)
	if err != nil {
		return nil, err
	}
	for k, vv := range headers {
		for _, v := range vv {
			req.Header.Add(k, v)
		}
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
		_ = resp.Body.Close()
		return nil, &HTTPError{Status: resp.StatusCode, Body: b}
	}
	return resp, nil
}
