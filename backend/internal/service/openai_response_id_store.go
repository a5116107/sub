package service

import (
	"context"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/ctxkey"
)

// OpenAIResponseIDStore persists response_id -> account_id mappings.
// This enables stable routing for /responses/{response_id} endpoints.
type OpenAIResponseIDStore interface {
	GetResponseAccountID(ctx context.Context, groupID int64, responseID string) (int64, error)
	SetResponseAccountID(ctx context.Context, groupID int64, responseID string, accountID int64, ttl time.Duration) error
	DeleteResponseAccountID(ctx context.Context, groupID int64, responseID string) error
}

const defaultOpenAIResponseIDTTL = 30 * 24 * time.Hour

func (s *OpenAIGatewayService) responseIDStore() OpenAIResponseIDStore {
	if s == nil || s.cache == nil {
		return nil
	}
	if store, ok := s.cache.(OpenAIResponseIDStore); ok {
		return store
	}
	return nil
}

func (s *OpenAIGatewayService) responseIDTTL() time.Duration {
	// Reserved for future config overrides.
	return defaultOpenAIResponseIDTTL
}

func openAIResponseGroupID(ctx context.Context) int64 {
	if ctx == nil {
		return 0
	}
	if group, ok := ctx.Value(ctxkey.Group).(*Group); ok && IsGroupContextValid(group) {
		return group.ID
	}
	return 0
}

// RememberResponseAccountID stores response_id routing for the current group.
func (s *OpenAIGatewayService) RememberResponseAccountID(ctx context.Context, responseID string, accountID int64) {
	store := s.responseIDStore()
	if store == nil {
		return
	}
	responseID = strings.TrimSpace(responseID)
	if responseID == "" || accountID <= 0 {
		return
	}
	groupID := openAIResponseGroupID(ctx)
	if groupID <= 0 {
		return
	}
	_ = store.SetResponseAccountID(ctx, groupID, responseID, accountID, s.responseIDTTL())
}

// LookupResponseAccountID returns the stored account id for the response_id.
func (s *OpenAIGatewayService) LookupResponseAccountID(ctx context.Context, responseID string) (int64, bool) {
	store := s.responseIDStore()
	if store == nil {
		return 0, false
	}
	responseID = strings.TrimSpace(responseID)
	if responseID == "" {
		return 0, false
	}
	groupID := openAIResponseGroupID(ctx)
	if groupID <= 0 {
		return 0, false
	}
	accountID, err := store.GetResponseAccountID(ctx, groupID, responseID)
	if err != nil || accountID <= 0 {
		return 0, false
	}
	return accountID, true
}

// ForgetResponseAccountID clears the stored mapping for a response_id.
func (s *OpenAIGatewayService) ForgetResponseAccountID(ctx context.Context, responseID string) {
	store := s.responseIDStore()
	if store == nil {
		return
	}
	responseID = strings.TrimSpace(responseID)
	if responseID == "" {
		return
	}
	groupID := openAIResponseGroupID(ctx)
	if groupID <= 0 {
		return
	}
	_ = store.DeleteResponseAccountID(ctx, groupID, responseID)
}
