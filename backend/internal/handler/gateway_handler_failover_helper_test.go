package handler

import (
	"context"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/service"
)

func TestNeedForceCacheBilling(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name            string
		hasBoundSession bool
		failoverErr     *service.UpstreamFailoverError
		want            bool
	}{
		{
			name:            "bound session enforces cache billing",
			hasBoundSession: true,
			failoverErr:     nil,
			want:            true,
		},
		{
			name:            "nil failover and no bound session",
			hasBoundSession: false,
			failoverErr:     nil,
			want:            false,
		},
		{
			name:            "upstream force flag enforces cache billing",
			hasBoundSession: false,
			failoverErr:     &service.UpstreamFailoverError{ForceCacheBilling: true},
			want:            true,
		},
		{
			name:            "no bound session and no force flag",
			hasBoundSession: false,
			failoverErr:     &service.UpstreamFailoverError{ForceCacheBilling: false},
			want:            false,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := needForceCacheBilling(tc.hasBoundSession, tc.failoverErr)
			if got != tc.want {
				t.Fatalf("needForceCacheBilling() = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestSleepFailoverDelay(t *testing.T) {
	t.Parallel()

	t.Run("first switch has no delay", func(t *testing.T) {
		start := time.Now()
		if !sleepFailoverDelay(context.Background(), 1) {
			t.Fatalf("expected delay helper to return true")
		}
		if elapsed := time.Since(start); elapsed > 100*time.Millisecond {
			t.Fatalf("expected first switch to be near-immediate, got %v", elapsed)
		}
	})

	t.Run("second switch waits about one second", func(t *testing.T) {
		start := time.Now()
		if !sleepFailoverDelay(context.Background(), 2) {
			t.Fatalf("expected delay helper to return true")
		}
		if elapsed := time.Since(start); elapsed < 900*time.Millisecond {
			t.Fatalf("expected second switch delay >= 900ms, got %v", elapsed)
		}
	})

	t.Run("cancelled context returns false immediately", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel()
		start := time.Now()
		if sleepFailoverDelay(ctx, 3) {
			t.Fatalf("expected delay helper to return false when context is cancelled")
		}
		if elapsed := time.Since(start); elapsed > 100*time.Millisecond {
			t.Fatalf("expected cancelled context to return quickly, got %v", elapsed)
		}
	})
}
