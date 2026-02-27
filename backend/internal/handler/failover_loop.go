package handler

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/service"
)

// TempUnscheduler is used by FailoverState to apply temp-unschedule side effects
// after same-account retries are exhausted. GatewayService implicitly implements it.
type TempUnscheduler interface {
	TempUnscheduleRetryableError(ctx context.Context, accountID int64, failoverErr *service.UpstreamFailoverError)
}

// FailoverAction indicates what the caller should do after handling a failover condition.
type FailoverAction int

const (
	// FailoverContinue means the caller should continue the loop (same-account retry or switch account).
	FailoverContinue FailoverAction = iota
	// FailoverExhausted means account switches are exhausted; the caller should return an error response.
	FailoverExhausted
	// FailoverCanceled means context was canceled; the caller should abort immediately.
	FailoverCanceled
)

const (
	// maxSameAccountRetries is the max retries on the same account for RetryableOnSameAccount errors.
	maxSameAccountRetries = 2
	// sameAccountRetryDelay is the fixed delay between same-account retries.
	sameAccountRetryDelay = 500 * time.Millisecond
	// singleAccountBackoffDelay is the fixed delay for single-account group 503 backoff retry.
	singleAccountBackoffDelay = 2 * time.Second
)

// FailoverState holds state shared across iterations of a failover loop.
type FailoverState struct {
	SwitchCount           int
	MaxSwitches           int
	FailedAccountIDs      map[int64]struct{}
	SameAccountRetryCount map[int64]int
	LastFailoverErr       *service.UpstreamFailoverError
	ForceCacheBilling     bool
	hasBoundSession       bool
}

func NewFailoverState(maxSwitches int, hasBoundSession bool) *FailoverState {
	return &FailoverState{
		MaxSwitches:           maxSwitches,
		FailedAccountIDs:      make(map[int64]struct{}),
		SameAccountRetryCount: make(map[int64]int),
		hasBoundSession:       hasBoundSession,
	}
}

// HandleFailoverError consumes an UpstreamFailoverError and returns the next action.
// It implements: ForceCacheBilling tracking, same-account retry, temp-unschedule,
// switch count, and Antigravity per-switch delay.
func (s *FailoverState) HandleFailoverError(
	ctx context.Context,
	gatewayService TempUnscheduler,
	accountID int64,
	platform string,
	failoverErr *service.UpstreamFailoverError,
) FailoverAction {
	s.LastFailoverErr = failoverErr

	// Cache billing forcing (sticky session switch or explicit upstream flag).
	if needForceCacheBilling(s.hasBoundSession, failoverErr) {
		s.ForceCacheBilling = true
	}

	// Same-account retry for transient errors.
	if failoverErr.RetryableOnSameAccount && s.SameAccountRetryCount[accountID] < maxSameAccountRetries {
		s.SameAccountRetryCount[accountID]++
		log.Printf("Account %d: retryable error %d, same-account retry %d/%d",
			accountID, failoverErr.StatusCode, s.SameAccountRetryCount[accountID], maxSameAccountRetries)
		if !sleepWithContext(ctx, sameAccountRetryDelay) {
			return FailoverCanceled
		}
		return FailoverContinue
	}

	// Same-account retries exhausted: apply temp-unschedule side effects.
	if failoverErr.RetryableOnSameAccount && gatewayService != nil {
		gatewayService.TempUnscheduleRetryableError(ctx, accountID, failoverErr)
	}

	// Mark this account as failed for subsequent selection.
	s.FailedAccountIDs[accountID] = struct{}{}

	if s.SwitchCount >= s.MaxSwitches {
		return FailoverExhausted
	}

	s.SwitchCount++
	log.Printf("Account %d: upstream error %d, switching account %d/%d",
		accountID, failoverErr.StatusCode, s.SwitchCount, s.MaxSwitches)

	// Antigravity: linear backoff per switch.
	if platform == service.PlatformAntigravity {
		delay := time.Duration(s.SwitchCount-1) * time.Second
		if !sleepWithContext(ctx, delay) {
			return FailoverCanceled
		}
	}

	return FailoverContinue
}

// HandleSelectionExhausted handles selection failures caused by excluding all candidates.
// Special-case: Antigravity single-account 503 backoff retry (MODEL_CAPACITY_EXHAUSTED).
// When returning FailoverContinue, the caller should set ctxkey.SingleAccountRetry and continue.
func (s *FailoverState) HandleSelectionExhausted(ctx context.Context) FailoverAction {
	if s.LastFailoverErr != nil &&
		s.LastFailoverErr.StatusCode == http.StatusServiceUnavailable &&
		s.SwitchCount <= s.MaxSwitches {

		log.Printf("Antigravity single-account 503 backoff: waiting %v before retry (attempt %d)",
			singleAccountBackoffDelay, s.SwitchCount)
		if !sleepWithContext(ctx, singleAccountBackoffDelay) {
			return FailoverCanceled
		}
		log.Printf("Antigravity single-account 503 retry: clearing failed accounts, retry %d/%d",
			s.SwitchCount, s.MaxSwitches)
		s.FailedAccountIDs = make(map[int64]struct{})
		return FailoverContinue
	}
	return FailoverExhausted
}

// needForceCacheBilling decides whether we should force cache billing across retries/failover.
func needForceCacheBilling(hasBoundSession bool, failoverErr *service.UpstreamFailoverError) bool {
	return hasBoundSession || (failoverErr != nil && failoverErr.ForceCacheBilling)
}

func sleepWithContext(ctx context.Context, d time.Duration) bool {
	if d <= 0 {
		return true
	}
	select {
	case <-ctx.Done():
		return false
	case <-time.After(d):
		return true
	}
}

