package service

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
)

func TestBillingSpoolService_EnqueueAndDrain_SuccessMovesToDone(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	cfg := &config.Config{
		RunMode: config.RunModeStandard,
		Billing: config.BillingConfig{
			Spool: config.BillingSpoolConfig{
				Enabled:       true,
				Dir:           dir,
				FlushInterval: 10 * time.Millisecond,
				BatchSize:     10,
				Timeout:       1 * time.Second,
			},
		},
	}

	svc := NewBillingSpoolService(nil, nil, nil, nil, nil, cfg)
	applied := 0
	svc.apply = func(ctx context.Context, ev *BillingSpoolEvent) error {
		applied++
		return nil
	}

	ev := &BillingSpoolEvent{
		Usage: BillingSpoolUsageLog{
			UserID:    1,
			APIKeyID:  2,
			AccountID: 3,
			RequestID: "req-1",
			Model:     "m",
			CreatedAt: time.Now(),
		},
		Billing: BillingSpoolBilling{
			DeltaUSD:    1.23,
			BillingType: BillingTypeBalance,
			UserID:      1,
			APIKeyID:    2,
		},
	}

	if err := svc.Enqueue(context.Background(), ev); err != nil {
		t.Fatalf("Enqueue: %v", err)
	}

	n, err := svc.DrainOnce(context.Background(), 10)
	if err != nil {
		t.Fatalf("DrainOnce: %v", err)
	}
	if n != 1 {
		t.Fatalf("processed=%d, want 1", n)
	}
	if applied != 1 {
		t.Fatalf("applied=%d, want 1", applied)
	}

	pending, _ := os.ReadDir(filepath.Join(dir, "pending"))
	if len(pending) != 0 {
		t.Fatalf("pending not empty: %d", len(pending))
	}
	done, _ := os.ReadDir(filepath.Join(dir, "done"))
	if len(done) != 1 {
		t.Fatalf("done=%d, want 1", len(done))
	}
}

func TestBillingSpoolService_Drain_ApplyFailureMovesBackToPending(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	cfg := &config.Config{
		RunMode: config.RunModeStandard,
		Billing: config.BillingConfig{
			Spool: config.BillingSpoolConfig{
				Enabled:       true,
				Dir:           dir,
				FlushInterval: 10 * time.Millisecond,
				BatchSize:     10,
				Timeout:       1 * time.Second,
			},
		},
	}

	svc := NewBillingSpoolService(nil, nil, nil, nil, nil, cfg)
	svc.apply = func(ctx context.Context, ev *BillingSpoolEvent) error {
		return errors.New("boom")
	}

	ev := &BillingSpoolEvent{
		Usage: BillingSpoolUsageLog{
			UserID:    1,
			APIKeyID:  2,
			AccountID: 3,
			RequestID: "req-2",
			Model:     "m",
			CreatedAt: time.Now(),
		},
		Billing: BillingSpoolBilling{
			DeltaUSD:    1.23,
			BillingType: BillingTypeBalance,
			UserID:      1,
			APIKeyID:    2,
		},
	}
	if err := svc.Enqueue(context.Background(), ev); err != nil {
		t.Fatalf("Enqueue: %v", err)
	}

	n, err := svc.DrainOnce(context.Background(), 10)
	if err != nil {
		t.Fatalf("DrainOnce: %v", err)
	}
	if n != 0 {
		t.Fatalf("processed=%d, want 0", n)
	}

	pending, _ := os.ReadDir(filepath.Join(dir, "pending"))
	if len(pending) != 1 {
		t.Fatalf("pending=%d, want 1", len(pending))
	}
	done, _ := os.ReadDir(filepath.Join(dir, "done"))
	if len(done) != 0 {
		t.Fatalf("done=%d, want 0", len(done))
	}
}

