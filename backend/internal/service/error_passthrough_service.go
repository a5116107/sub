package service

import (
	"context"
	"log"
	"sort"
	"strings"
	"sync"

	"github.com/Wei-Shaw/sub2api/internal/model"
)

// ErrorPassthroughRepository defines persistence operations for passthrough rules.
type ErrorPassthroughRepository interface {
	List(ctx context.Context) ([]*model.ErrorPassthroughRule, error)
	GetByID(ctx context.Context, id int64) (*model.ErrorPassthroughRule, error)
	Create(ctx context.Context, rule *model.ErrorPassthroughRule) (*model.ErrorPassthroughRule, error)
	Update(ctx context.Context, rule *model.ErrorPassthroughRule) (*model.ErrorPassthroughRule, error)
	Delete(ctx context.Context, id int64) error
}

// ErrorPassthroughCache defines cache operations for passthrough rules.
type ErrorPassthroughCache interface {
	Get(ctx context.Context) ([]*model.ErrorPassthroughRule, bool)
	Set(ctx context.Context, rules []*model.ErrorPassthroughRule) error
	Invalidate(ctx context.Context) error
	NotifyUpdate(ctx context.Context) error
	SubscribeUpdates(ctx context.Context, handler func())
}

// ErrorPassthroughService handles global error passthrough rules.
type ErrorPassthroughService struct {
	repo  ErrorPassthroughRepository
	cache ErrorPassthroughCache

	localCache   []*model.ErrorPassthroughRule
	localCacheMu sync.RWMutex
}

// NewErrorPassthroughService creates a new ErrorPassthroughService.
func NewErrorPassthroughService(repo ErrorPassthroughRepository, cache ErrorPassthroughCache) *ErrorPassthroughService {
	svc := &ErrorPassthroughService{
		repo:  repo,
		cache: cache,
	}

	ctx := context.Background()
	if err := svc.refreshLocalCache(ctx); err != nil {
		log.Printf("[ErrorPassthroughService] startup cache load failed: %v", err)
	}

	if cache != nil {
		cache.SubscribeUpdates(ctx, func() {
			if err := svc.refreshLocalCache(context.Background()); err != nil {
				log.Printf("[ErrorPassthroughService] refresh from pubsub failed: %v", err)
			}
		})
	}

	return svc
}

func (s *ErrorPassthroughService) List(ctx context.Context) ([]*model.ErrorPassthroughRule, error) {
	return s.repo.List(ctx)
}

func (s *ErrorPassthroughService) GetByID(ctx context.Context, id int64) (*model.ErrorPassthroughRule, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *ErrorPassthroughService) Create(ctx context.Context, rule *model.ErrorPassthroughRule) (*model.ErrorPassthroughRule, error) {
	if err := rule.Validate(); err != nil {
		return nil, err
	}

	created, err := s.repo.Create(ctx, rule)
	if err != nil {
		return nil, err
	}
	s.invalidateAndNotify(ctx)
	return created, nil
}

func (s *ErrorPassthroughService) Update(ctx context.Context, rule *model.ErrorPassthroughRule) (*model.ErrorPassthroughRule, error) {
	if err := rule.Validate(); err != nil {
		return nil, err
	}

	updated, err := s.repo.Update(ctx, rule)
	if err != nil {
		return nil, err
	}
	s.invalidateAndNotify(ctx)
	return updated, nil
}

func (s *ErrorPassthroughService) Delete(ctx context.Context, id int64) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}
	s.invalidateAndNotify(ctx)
	return nil
}

// MatchRule returns the first matched rule by priority.
func (s *ErrorPassthroughService) MatchRule(platform string, statusCode int, body []byte) *model.ErrorPassthroughRule {
	rules := s.getCachedRules()
	if len(rules) == 0 {
		return nil
	}

	bodyLower := strings.ToLower(string(body))
	for _, rule := range rules {
		if !rule.Enabled {
			continue
		}
		if !s.platformMatches(rule, platform) {
			continue
		}
		if s.ruleMatches(rule, statusCode, bodyLower) {
			return rule
		}
	}

	return nil
}

func (s *ErrorPassthroughService) getCachedRules() []*model.ErrorPassthroughRule {
	s.localCacheMu.RLock()
	rules := s.localCache
	s.localCacheMu.RUnlock()
	if rules != nil {
		return rules
	}

	if err := s.refreshLocalCache(context.Background()); err != nil {
		log.Printf("[ErrorPassthroughService] lazy cache refresh failed: %v", err)
		return nil
	}

	s.localCacheMu.RLock()
	defer s.localCacheMu.RUnlock()
	return s.localCache
}

func (s *ErrorPassthroughService) refreshLocalCache(ctx context.Context) error {
	if s.cache != nil {
		if rules, ok := s.cache.Get(ctx); ok {
			s.setLocalCache(rules)
			return nil
		}
	}

	rules, err := s.repo.List(ctx)
	if err != nil {
		return err
	}

	if s.cache != nil {
		if err := s.cache.Set(ctx, rules); err != nil {
			log.Printf("[ErrorPassthroughService] cache set failed: %v", err)
		}
	}

	s.setLocalCache(rules)
	return nil
}

func (s *ErrorPassthroughService) setLocalCache(rules []*model.ErrorPassthroughRule) {
	sorted := make([]*model.ErrorPassthroughRule, len(rules))
	copy(sorted, rules)
	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].Priority == sorted[j].Priority {
			return sorted[i].ID < sorted[j].ID
		}
		return sorted[i].Priority < sorted[j].Priority
	})

	s.localCacheMu.Lock()
	s.localCache = sorted
	s.localCacheMu.Unlock()
}

func (s *ErrorPassthroughService) invalidateAndNotify(ctx context.Context) {
	if s.cache != nil {
		if err := s.cache.Invalidate(ctx); err != nil {
			log.Printf("[ErrorPassthroughService] cache invalidate failed: %v", err)
		}
	}
	if err := s.refreshLocalCache(ctx); err != nil {
		log.Printf("[ErrorPassthroughService] local refresh after write failed: %v", err)
	}
	if s.cache != nil {
		if err := s.cache.NotifyUpdate(ctx); err != nil {
			log.Printf("[ErrorPassthroughService] cache notify failed: %v", err)
		}
	}
}

func (s *ErrorPassthroughService) platformMatches(rule *model.ErrorPassthroughRule, platform string) bool {
	if len(rule.Platforms) == 0 {
		return true
	}

	target := strings.TrimSpace(strings.ToLower(platform))
	for _, item := range rule.Platforms {
		if strings.TrimSpace(strings.ToLower(item)) == target {
			return true
		}
	}
	return false
}

func (s *ErrorPassthroughService) ruleMatches(rule *model.ErrorPassthroughRule, statusCode int, bodyLower string) bool {
	hasCodes := len(rule.ErrorCodes) > 0
	hasKeywords := len(rule.Keywords) > 0
	if !hasCodes && !hasKeywords {
		return false
	}

	codeMatch := !hasCodes || s.containsInt(rule.ErrorCodes, statusCode)
	keywordMatch := !hasKeywords || s.containsAnyKeyword(bodyLower, rule.Keywords)

	if rule.MatchMode == model.MatchModeAll {
		return codeMatch && keywordMatch
	}
	if hasCodes && hasKeywords {
		return codeMatch || keywordMatch
	}
	return codeMatch && keywordMatch
}

func (s *ErrorPassthroughService) containsInt(slice []int, val int) bool {
	for _, item := range slice {
		if item == val {
			return true
		}
	}
	return false
}

func (s *ErrorPassthroughService) containsAnyKeyword(bodyLower string, keywords []string) bool {
	for _, keyword := range keywords {
		if strings.Contains(bodyLower, strings.ToLower(keyword)) {
			return true
		}
	}
	return false
}
