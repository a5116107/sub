package service

import (
	"context"
	"errors"
	"testing"
)

type rateLimitClearRepoSpy struct {
	AccountRepository

	clearTempCalls  int
	clearModelCalls int
	clearTempErr    error
	clearModelErr   error
}

func (s *rateLimitClearRepoSpy) ClearTempUnschedulable(ctx context.Context, id int64) error {
	s.clearTempCalls++
	return s.clearTempErr
}

func (s *rateLimitClearRepoSpy) ClearModelRateLimits(ctx context.Context, id int64) error {
	s.clearModelCalls++
	return s.clearModelErr
}

func TestRateLimitServiceClearTempUnschedulable_ClearsModelRateLimits(t *testing.T) {
	t.Parallel()

	repo := &rateLimitClearRepoSpy{}
	svc := &RateLimitService{accountRepo: repo}

	if err := svc.ClearTempUnschedulable(context.Background(), 1001); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if repo.clearTempCalls != 1 {
		t.Fatalf("expected ClearTempUnschedulable once, got %d", repo.clearTempCalls)
	}
	if repo.clearModelCalls != 1 {
		t.Fatalf("expected ClearModelRateLimits once, got %d", repo.clearModelCalls)
	}
}

func TestRateLimitServiceClearTempUnschedulable_StopsOnClearTempError(t *testing.T) {
	t.Parallel()

	repo := &rateLimitClearRepoSpy{clearTempErr: errors.New("clear temp failed")}
	svc := &RateLimitService{accountRepo: repo}

	if err := svc.ClearTempUnschedulable(context.Background(), 1002); err == nil {
		t.Fatalf("expected error from ClearTempUnschedulable")
	}
	if repo.clearTempCalls != 1 {
		t.Fatalf("expected ClearTempUnschedulable once, got %d", repo.clearTempCalls)
	}
	if repo.clearModelCalls != 0 {
		t.Fatalf("expected ClearModelRateLimits not called, got %d", repo.clearModelCalls)
	}
}

func TestRateLimitServiceClearTempUnschedulable_IgnoresClearModelRateLimitError(t *testing.T) {
	t.Parallel()

	repo := &rateLimitClearRepoSpy{clearModelErr: errors.New("clear model failed")}
	svc := &RateLimitService{accountRepo: repo}

	if err := svc.ClearTempUnschedulable(context.Background(), 1003); err != nil {
		t.Fatalf("expected nil error when ClearModelRateLimits fails, got %v", err)
	}
	if repo.clearTempCalls != 1 {
		t.Fatalf("expected ClearTempUnschedulable once, got %d", repo.clearTempCalls)
	}
	if repo.clearModelCalls != 1 {
		t.Fatalf("expected ClearModelRateLimits once, got %d", repo.clearModelCalls)
	}
}
