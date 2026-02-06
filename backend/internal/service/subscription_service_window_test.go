package service

import (
	"context"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/timezone"
	"github.com/stretchr/testify/require"
)

type spyUserSubscriptionRepo struct {
	UserSubscriptionRepository

	activateCalled bool
	activateID     int64
	activateStart  time.Time

	resetDailyCalled   bool
	resetDailyID       int64
	resetDailyStart    time.Time
	resetWeeklyCalled  bool
	resetMonthlyCalled bool
}

func (r *spyUserSubscriptionRepo) ActivateWindows(_ context.Context, id int64, start time.Time) error {
	r.activateCalled = true
	r.activateID = id
	r.activateStart = start
	return nil
}

func (r *spyUserSubscriptionRepo) ResetDailyUsage(_ context.Context, id int64, newWindowStart time.Time) error {
	r.resetDailyCalled = true
	r.resetDailyID = id
	r.resetDailyStart = newWindowStart
	return nil
}

func (r *spyUserSubscriptionRepo) ResetWeeklyUsage(_ context.Context, _ int64, _ time.Time) error {
	r.resetWeeklyCalled = true
	return nil
}

func (r *spyUserSubscriptionRepo) ResetMonthlyUsage(_ context.Context, _ int64, _ time.Time) error {
	r.resetMonthlyCalled = true
	return nil
}

func TestSubscriptionService_CheckAndActivateWindow_UsesStartOfDayForDailyWindow(t *testing.T) {
	t.Parallel()

	repo := &spyUserSubscriptionRepo{}
	svc := NewSubscriptionService(nil, repo, nil)

	activateAt := time.Date(2026, 1, 27, 15, 4, 5, 123456789, time.Local)
	svc.now = func() time.Time { return activateAt }

	sub := &UserSubscription{ID: 42}
	require.NoError(t, svc.CheckAndActivateWindow(context.Background(), sub))

	require.True(t, repo.activateCalled)
	require.Equal(t, int64(42), repo.activateID)
	require.Equal(t, timezone.StartOfDay(activateAt), repo.activateStart)
}

func TestSubscriptionService_CheckAndActivateWindow_SkipsWhenActivated(t *testing.T) {
	t.Parallel()

	repo := &spyUserSubscriptionRepo{}
	svc := NewSubscriptionService(nil, repo, nil)

	now := time.Now()
	sub := &UserSubscription{
		ID:               42,
		DailyWindowStart: &now,
	}
	require.NoError(t, svc.CheckAndActivateWindow(context.Background(), sub))
	require.False(t, repo.activateCalled)
}

func TestSubscriptionService_CheckAndResetWindows_ResetsDailyAtStartOfDay(t *testing.T) {
	t.Parallel()

	repo := &spyUserSubscriptionRepo{}
	svc := NewSubscriptionService(nil, repo, nil)

	now := time.Date(2026, 1, 28, 10, 0, 0, 0, time.Local)
	svc.now = func() time.Time { return now }

	oldDaily := time.Date(2026, 1, 27, 23, 0, 0, 0, time.Local)
	sub := &UserSubscription{
		ID:               7,
		DailyWindowStart: &oldDaily,
		DailyUsageUSD:    12.34,
	}

	require.NoError(t, svc.CheckAndResetWindows(context.Background(), sub))

	require.True(t, repo.resetDailyCalled)
	require.Equal(t, int64(7), repo.resetDailyID)
	require.Equal(t, timezone.StartOfDay(now), repo.resetDailyStart)
	require.False(t, repo.resetWeeklyCalled)
	require.False(t, repo.resetMonthlyCalled)

	require.NotNil(t, sub.DailyWindowStart)
	require.Equal(t, timezone.StartOfDay(now), *sub.DailyWindowStart)
	require.Equal(t, float64(0), sub.DailyUsageUSD)
}
