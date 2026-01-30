package sub2api

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"
)

type AuthClient struct {
	client *Client
}

type LoginRequest struct {
	Email          string `json:"email"`
	Password       string `json:"password"`
	TurnstileToken string `json:"turnstile_token,omitempty"`
}

type AuthUser struct {
	ID        int64     `json:"id"`
	Email     string    `json:"email"`
	Username  string    `json:"username"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AuthResponse struct {
	AccessToken string    `json:"access_token"`
	TokenType   string    `json:"token_type"`
	User        *AuthUser `json:"user,omitempty"`
}

func (a *AuthClient) Login(ctx context.Context, req *LoginRequest) (*AuthResponse, error) {
	if a == nil || a.client == nil {
		return nil, errors.New("client not initialized")
	}
	if req == nil {
		return nil, errors.New("request is required")
	}
	if strings.TrimSpace(req.Email) == "" {
		return nil, errors.New("email is required")
	}
	if strings.TrimSpace(req.Password) == "" {
		return nil, errors.New("password is required")
	}
	out, err := doEnvelope[AuthResponse](ctx, a.client, http.MethodPost, "/api/v1/auth/login", nil, "", req)
	if err != nil {
		return nil, err
	}
	return &out, nil
}
