package sub2api

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type AdminClient struct {
	client *Client
	token  string
}

func (a *AdminClient) authHeader() string {
	return bearerAuthHeader(a.token)
}

type AdminGroup struct {
	ID             int64   `json:"id"`
	Name           string  `json:"name"`
	Description    string  `json:"description"`
	Platform       string  `json:"platform"`
	RateMultiplier float64 `json:"rate_multiplier"`
	IsExclusive    bool    `json:"is_exclusive"`
	Status         string  `json:"status"`

	ModelRouting        map[string][]int64 `json:"model_routing,omitempty"`
	ModelRoutingEnabled bool               `json:"model_routing_enabled,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type GroupUpsertRequest struct {
	Name           string   `json:"name,omitempty"`
	Description    string   `json:"description,omitempty"`
	Platform       string   `json:"platform,omitempty"`
	RateMultiplier *float64 `json:"rate_multiplier,omitempty"`
	IsExclusive    *bool    `json:"is_exclusive,omitempty"`
	Status         string   `json:"status,omitempty"`

	SubscriptionType string   `json:"subscription_type,omitempty"`
	DailyLimitUSD    *float64 `json:"daily_limit_usd,omitempty"`
	WeeklyLimitUSD   *float64 `json:"weekly_limit_usd,omitempty"`
	MonthlyLimitUSD  *float64 `json:"monthly_limit_usd,omitempty"`

	ClaudeCodeOnly      *bool              `json:"claude_code_only,omitempty"`
	FallbackGroupID     *int64             `json:"fallback_group_id,omitempty"`
	ModelRouting        map[string][]int64 `json:"model_routing,omitempty"`
	ModelRoutingEnabled *bool              `json:"model_routing_enabled,omitempty"`
}

func (a *AdminClient) ListGroups(ctx context.Context, query url.Values) (*PaginatedData[AdminGroup], error) {
	if a == nil || a.client == nil {
		return nil, errors.New("client not initialized")
	}
	data, err := doEnvelope[PaginatedData[AdminGroup]](ctx, a.client, http.MethodGet, "/api/v1/admin/groups", query, a.authHeader(), nil)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (a *AdminClient) GetAllGroups(ctx context.Context, platform string) ([]AdminGroup, error) {
	if a == nil || a.client == nil {
		return nil, errors.New("client not initialized")
	}
	q := url.Values{}
	if strings.TrimSpace(platform) != "" {
		q.Set("platform", strings.TrimSpace(platform))
	}
	data, err := doEnvelope[[]AdminGroup](ctx, a.client, http.MethodGet, "/api/v1/admin/groups/all", q, a.authHeader(), nil)
	if err != nil {
		return nil, err
	}
	return data, nil
}

func (a *AdminClient) GetGroup(ctx context.Context, id int64) (*AdminGroup, error) {
	if a == nil || a.client == nil {
		return nil, errors.New("client not initialized")
	}
	data, err := doEnvelope[AdminGroup](ctx, a.client, http.MethodGet, "/api/v1/admin/groups/"+strconv.FormatInt(id, 10), nil, a.authHeader(), nil)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (a *AdminClient) CreateGroup(ctx context.Context, req *GroupUpsertRequest) (*AdminGroup, error) {
	if a == nil || a.client == nil {
		return nil, errors.New("client not initialized")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}
	data, err := doEnvelope[AdminGroup](ctx, a.client, http.MethodPost, "/api/v1/admin/groups", nil, a.authHeader(), req)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (a *AdminClient) UpdateGroup(ctx context.Context, id int64, req *GroupUpsertRequest) (*AdminGroup, error) {
	if a == nil || a.client == nil {
		return nil, errors.New("client not initialized")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}
	data, err := doEnvelope[AdminGroup](ctx, a.client, http.MethodPut, "/api/v1/admin/groups/"+strconv.FormatInt(id, 10), nil, a.authHeader(), req)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (a *AdminClient) DeleteGroup(ctx context.Context, id int64) error {
	if a == nil || a.client == nil {
		return errors.New("client not initialized")
	}
	_, err := doEnvelope[map[string]any](ctx, a.client, http.MethodDelete, "/api/v1/admin/groups/"+strconv.FormatInt(id, 10), nil, a.authHeader(), nil)
	return err
}

type AdminProxy struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Protocol string `json:"protocol"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Status   string `json:"status"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ProxyUpsertRequest struct {
	Name     string `json:"name,omitempty"`
	Protocol string `json:"protocol,omitempty"`
	Host     string `json:"host,omitempty"`
	Port     int    `json:"port,omitempty"`
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
	Status   string `json:"status,omitempty"`
}

func (a *AdminClient) ListProxies(ctx context.Context, query url.Values) (*PaginatedData[AdminProxy], error) {
	if a == nil || a.client == nil {
		return nil, errors.New("client not initialized")
	}
	data, err := doEnvelope[PaginatedData[AdminProxy]](ctx, a.client, http.MethodGet, "/api/v1/admin/proxies", query, a.authHeader(), nil)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (a *AdminClient) GetAllProxies(ctx context.Context) ([]AdminProxy, error) {
	if a == nil || a.client == nil {
		return nil, errors.New("client not initialized")
	}
	data, err := doEnvelope[[]AdminProxy](ctx, a.client, http.MethodGet, "/api/v1/admin/proxies/all", nil, a.authHeader(), nil)
	if err != nil {
		return nil, err
	}
	return data, nil
}

func (a *AdminClient) GetProxy(ctx context.Context, id int64) (*AdminProxy, error) {
	if a == nil || a.client == nil {
		return nil, errors.New("client not initialized")
	}
	data, err := doEnvelope[AdminProxy](ctx, a.client, http.MethodGet, "/api/v1/admin/proxies/"+strconv.FormatInt(id, 10), nil, a.authHeader(), nil)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (a *AdminClient) CreateProxy(ctx context.Context, req *ProxyUpsertRequest) (*AdminProxy, error) {
	if a == nil || a.client == nil {
		return nil, errors.New("client not initialized")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}
	data, err := doEnvelope[AdminProxy](ctx, a.client, http.MethodPost, "/api/v1/admin/proxies", nil, a.authHeader(), req)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (a *AdminClient) UpdateProxy(ctx context.Context, id int64, req *ProxyUpsertRequest) (*AdminProxy, error) {
	if a == nil || a.client == nil {
		return nil, errors.New("client not initialized")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}
	data, err := doEnvelope[AdminProxy](ctx, a.client, http.MethodPut, "/api/v1/admin/proxies/"+strconv.FormatInt(id, 10), nil, a.authHeader(), req)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (a *AdminClient) DeleteProxy(ctx context.Context, id int64) error {
	if a == nil || a.client == nil {
		return errors.New("client not initialized")
	}
	_, err := doEnvelope[map[string]any](ctx, a.client, http.MethodDelete, "/api/v1/admin/proxies/"+strconv.FormatInt(id, 10), nil, a.authHeader(), nil)
	return err
}

type AdminAccount struct {
	ID           int64          `json:"id"`
	Name         string         `json:"name"`
	Notes        *string        `json:"notes,omitempty"`
	Platform     string         `json:"platform"`
	Type         string         `json:"type"`
	Credentials  map[string]any `json:"credentials"`
	Extra        map[string]any `json:"extra,omitempty"`
	ProxyID      *int64         `json:"proxy_id,omitempty"`
	Concurrency  int            `json:"concurrency"`
	Priority     int            `json:"priority"`
	Status       string         `json:"status"`
	ErrorMessage string         `json:"error_message,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AccountUpsertRequest struct {
	Name        string         `json:"name,omitempty"`
	Notes       *string        `json:"notes,omitempty"`
	Platform    string         `json:"platform,omitempty"`
	Type        string         `json:"type,omitempty"`
	Credentials map[string]any `json:"credentials,omitempty"`
	Extra       map[string]any `json:"extra,omitempty"`
	ProxyID     *int64         `json:"proxy_id,omitempty"`
	Concurrency *int           `json:"concurrency,omitempty"`
	Priority    *int           `json:"priority,omitempty"`
	Status      string         `json:"status,omitempty"`
}

func (a *AdminClient) ListAccounts(ctx context.Context, query url.Values) (*PaginatedData[AdminAccount], error) {
	if a == nil || a.client == nil {
		return nil, errors.New("client not initialized")
	}
	data, err := doEnvelope[PaginatedData[AdminAccount]](ctx, a.client, http.MethodGet, "/api/v1/admin/accounts", query, a.authHeader(), nil)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (a *AdminClient) GetAccount(ctx context.Context, id int64) (*AdminAccount, error) {
	if a == nil || a.client == nil {
		return nil, errors.New("client not initialized")
	}
	data, err := doEnvelope[AdminAccount](ctx, a.client, http.MethodGet, "/api/v1/admin/accounts/"+strconv.FormatInt(id, 10), nil, a.authHeader(), nil)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (a *AdminClient) CreateAccount(ctx context.Context, req *AccountUpsertRequest) (*AdminAccount, error) {
	if a == nil || a.client == nil {
		return nil, errors.New("client not initialized")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}
	data, err := doEnvelope[AdminAccount](ctx, a.client, http.MethodPost, "/api/v1/admin/accounts", nil, a.authHeader(), req)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (a *AdminClient) UpdateAccount(ctx context.Context, id int64, req *AccountUpsertRequest) (*AdminAccount, error) {
	if a == nil || a.client == nil {
		return nil, errors.New("client not initialized")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}
	data, err := doEnvelope[AdminAccount](ctx, a.client, http.MethodPut, "/api/v1/admin/accounts/"+strconv.FormatInt(id, 10), nil, a.authHeader(), req)
	if err != nil {
		return nil, err
	}
	return &data, nil
}

func (a *AdminClient) DeleteAccount(ctx context.Context, id int64) error {
	if a == nil || a.client == nil {
		return errors.New("client not initialized")
	}
	_, err := doEnvelope[map[string]any](ctx, a.client, http.MethodDelete, "/api/v1/admin/accounts/"+strconv.FormatInt(id, 10), nil, a.authHeader(), nil)
	return err
}
