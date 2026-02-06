package repository

import (
	"context"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

func TestBillingCache_ReserveFinalize_ByKey_Idempotent(t *testing.T) {
	s, err := miniredis.Run()
	require.NoError(t, err)
	t.Cleanup(s.Close)

	rdb := redis.NewClient(&redis.Options{Addr: s.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })

	cache := NewBillingCache(rdb)
	ctx := context.Background()

	userID := int64(9001)
	groupID := int64(9002)

	data := &service.SubscriptionCacheData{
		Status:    "active",
		ExpiresAt: time.Now().Add(1 * time.Hour),
		Version:   1,
	}
	require.NoError(t, cache.SetSubscriptionCache(ctx, userID, groupID, data))

	dailyLimit := 1.0
	key := "req-abc"

	code1, err := cache.ReserveSubscriptionUsageByKey(ctx, userID, groupID, key, 0.4, &dailyLimit, nil, nil)
	require.NoError(t, err)
	require.Equal(t, 1, code1)

	got1, err := cache.GetSubscriptionCache(ctx, userID, groupID)
	require.NoError(t, err)
	require.InDelta(t, 0.4, got1.ReservedUsage, 0.00001)

	// Reserve again with same key: should not increase reserved_usage.
	code2, err := cache.ReserveSubscriptionUsageByKey(ctx, userID, groupID, key, 0.4, &dailyLimit, nil, nil)
	require.NoError(t, err)
	require.Equal(t, 2, code2)

	got2, err := cache.GetSubscriptionCache(ctx, userID, groupID)
	require.NoError(t, err)
	require.InDelta(t, 0.4, got2.ReservedUsage, 0.00001)

	// Finalize once: should release and add actual usage.
	require.NoError(t, cache.FinalizeSubscriptionUsageByKey(ctx, userID, groupID, key, 0.4, 0.25))
	got3, err := cache.GetSubscriptionCache(ctx, userID, groupID)
	require.NoError(t, err)
	require.InDelta(t, 0.0, got3.ReservedUsage, 0.00001)
	require.InDelta(t, 0.25, got3.DailyUsage, 0.00001)

	// Finalize again: idempotent no-op.
	require.NoError(t, cache.FinalizeSubscriptionUsageByKey(ctx, userID, groupID, key, 0.4, 0.25))
	got4, err := cache.GetSubscriptionCache(ctx, userID, groupID)
	require.NoError(t, err)
	require.InDelta(t, 0.0, got4.ReservedUsage, 0.00001)
	require.InDelta(t, 0.25, got4.DailyUsage, 0.00001)
}

