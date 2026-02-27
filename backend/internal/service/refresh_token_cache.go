package service

import (
	"context"
	"errors"
	"time"
)

// ErrRefreshTokenNotFound is returned when a refresh token is not found in cache.
// This abstracts cache-specific miss errors (e.g. redis.Nil).
var ErrRefreshTokenNotFound = errors.New("refresh token not found")

// RefreshTokenData stores metadata for a refresh token.
type RefreshTokenData struct {
	UserID       int64     `json:"user_id"`
	TokenVersion int64     `json:"token_version"`
	FamilyID     string    `json:"family_id"`
	CreatedAt    time.Time `json:"created_at"`
	ExpiresAt    time.Time `json:"expires_at"`
}

// RefreshTokenCache manages refresh token state.
//
// Key patterns:
//   - refresh_token:{token_hash}    -> RefreshTokenData
//   - user_refresh_tokens:{user_id} -> Set<token_hash>
//   - token_family:{family_id}      -> Set<token_hash>
type RefreshTokenCache interface {
	StoreRefreshToken(ctx context.Context, tokenHash string, data *RefreshTokenData, ttl time.Duration) error
	GetRefreshToken(ctx context.Context, tokenHash string) (*RefreshTokenData, error)
	DeleteRefreshToken(ctx context.Context, tokenHash string) error
	DeleteUserRefreshTokens(ctx context.Context, userID int64) error
	DeleteTokenFamily(ctx context.Context, familyID string) error
	AddToUserTokenSet(ctx context.Context, userID int64, tokenHash string, ttl time.Duration) error
	AddToFamilyTokenSet(ctx context.Context, familyID string, tokenHash string, ttl time.Duration) error
	GetUserTokenHashes(ctx context.Context, userID int64) ([]string, error)
	GetFamilyTokenHashes(ctx context.Context, familyID string) ([]string, error)
	IsTokenInFamily(ctx context.Context, familyID string, tokenHash string) (bool, error)
}
