package service

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"sync"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/internal/config"
)

type BillingReconcileResult struct {
	Candidates int
	Applied    int
	Orphaned   int
	Errors     int
}

// BillingReconcileService is an optional safety net that reconciles billing ledger entries
// stuck in applied=false state (e.g. after transient DB errors or process crashes).
//
// It is disabled by default and must be explicitly enabled via config.
type BillingReconcileService struct {
	entClient           *dbent.Client
	userRepo            billingReconcileUserRepo
	userSubRepo         billingReconcileUserSubRepo
	usageLogRepo        billingReconcileUsageLogRepo
	billingCacheService *BillingCacheService
	cfg                 *config.Config
	referralRateCache   referralCommissionRateCache

	startOnce sync.Once
	stopOnce  sync.Once
	stopCh    chan struct{}
	doneCh    chan struct{}
}

type billingReconcileUserRepo interface {
	DeductBalance(ctx context.Context, id int64, amount float64) error
}

type billingReconcileUserSubRepo interface {
	IncrementUsage(ctx context.Context, id int64, costUSD float64) error
}

type billingReconcileUsageLogRepo interface {
	MarkBillingUsageEntryApplied(ctx context.Context, id int64) error
}

func NewBillingReconcileService(
	entClient *dbent.Client,
	userRepo billingReconcileUserRepo,
	userSubRepo billingReconcileUserSubRepo,
	usageLogRepo billingReconcileUsageLogRepo,
	billingCacheService *BillingCacheService,
	cfg *config.Config,
) *BillingReconcileService {
	return &BillingReconcileService{
		entClient:           entClient,
		userRepo:            userRepo,
		userSubRepo:         userSubRepo,
		usageLogRepo:        usageLogRepo,
		billingCacheService: billingCacheService,
		cfg:                 cfg,
		stopCh:              make(chan struct{}),
		doneCh:              make(chan struct{}),
	}
}

func (s *BillingReconcileService) enabled() bool {
	return s != nil && s.cfg != nil && s.cfg.Billing.Reconcile.Enabled
}

func (s *BillingReconcileService) Start() {
	if !s.enabled() {
		return
	}
	s.startOnce.Do(func() {
		go s.runLoop()
	})
}

func (s *BillingReconcileService) Stop() {
	if s == nil {
		return
	}
	s.stopOnce.Do(func() {
		close(s.stopCh)
	})
	<-s.doneCh
}

func (s *BillingReconcileService) runLoop() {
	defer close(s.doneCh)

	interval := s.cfg.Billing.Reconcile.Interval
	if interval <= 0 {
		interval = 60 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopCh:
			return
		case <-ticker.C:
			timeout := s.cfg.Billing.Reconcile.Timeout
			if timeout <= 0 {
				timeout = 5 * time.Second
			}
			batchSize := s.cfg.Billing.Reconcile.BatchSize
			if batchSize <= 0 {
				batchSize = 200
			}

			ctx, cancel := context.WithTimeout(context.Background(), timeout)
			res, err := s.ReconcileOnce(ctx, batchSize)
			cancel()
			if err != nil {
				log.Printf("[BillingReconcile] run failed: %v", err)
				continue
			}
			if res.Applied > 0 || res.Orphaned > 0 || res.Errors > 0 {
				log.Printf("[BillingReconcile] candidates=%d applied=%d orphaned=%d errors=%d", res.Candidates, res.Applied, res.Orphaned, res.Errors)
			}
		}
	}
}

func (s *BillingReconcileService) ReconcileOnce(ctx context.Context, batchSize int) (BillingReconcileResult, error) {
	if s == nil {
		return BillingReconcileResult{}, nil
	}
	if batchSize <= 0 {
		batchSize = 200
	}
	if s.entClient == nil || s.userRepo == nil || s.userSubRepo == nil || s.usageLogRepo == nil {
		return BillingReconcileResult{}, errors.New("billing reconcile dependencies not configured")
	}

	tx, err := s.entClient.Tx(ctx)
	if err != nil {
		return BillingReconcileResult{}, err
	}
	defer func() { _ = tx.Rollback() }()
	txCtx := dbent.NewTxContext(ctx, tx)

	type row struct {
		id             int64
		usageLogID     int64
		userID         int64
		inviterUserID  sql.NullInt64
		subscriptionID sql.NullInt64
		billingType    int16
		deltaUSD       float64
		groupID        sql.NullInt64
	}

	const q = `
		SELECT
			b.id,
			b.usage_log_id,
			b.user_id,
			u.invited_by_user_id,
			b.subscription_id,
			b.billing_type,
			b.delta_usd,
			ul.group_id
		FROM billing_usage_entries b
		JOIN usage_logs ul ON ul.id = b.usage_log_id
		JOIN users u ON u.id = b.user_id
		WHERE b.applied = FALSE
		ORDER BY b.id
		LIMIT $1
		FOR UPDATE SKIP LOCKED
	`

	rows, err := tx.Client().QueryContext(txCtx, q, batchSize)
	if err != nil {
		return BillingReconcileResult{}, err
	}
	defer func() { _ = rows.Close() }()

	candidates := make([]row, 0, batchSize)
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.usageLogID, &r.userID, &r.inviterUserID, &r.subscriptionID, &r.billingType, &r.deltaUSD, &r.groupID); err != nil {
			return BillingReconcileResult{}, err
		}
		candidates = append(candidates, r)
	}
	if err := rows.Err(); err != nil {
		return BillingReconcileResult{}, err
	}

	result := BillingReconcileResult{Candidates: len(candidates)}
	if len(candidates) == 0 {
		if err := tx.Commit(); err != nil {
			return BillingReconcileResult{}, err
		}
		return result, nil
	}

	type cacheUpdate struct {
		userID      int64
		groupID     *int64
		billingType int8
		deltaUSD    float64
	}
	cacheUpdates := make([]cacheUpdate, 0, len(candidates))

	type referralUpdate struct {
		usageLogID    int64
		inviterUserID int64
		inviteeUserID int64
		billedUSD     float64
	}
	referralUpdates := make([]referralUpdate, 0, len(candidates))

	for _, entry := range candidates {
		entryID := entry.id

		if entry.deltaUSD <= 0 {
			_ = s.usageLogRepo.MarkBillingUsageEntryApplied(txCtx, entryID)
			continue
		}

		bt := int8(entry.billingType)
		switch bt {
		case BillingTypeBalance:
			if err := s.userRepo.DeductBalance(txCtx, entry.userID, entry.deltaUSD); err != nil {
				result.Errors++
				continue
			}
			if err := s.usageLogRepo.MarkBillingUsageEntryApplied(txCtx, entryID); err != nil {
				result.Errors++
				continue
			}
			result.Applied++
			cacheUpdates = append(cacheUpdates, cacheUpdate{
				userID:      entry.userID,
				groupID:     nil,
				billingType: bt,
				deltaUSD:    entry.deltaUSD,
			})
			if entry.inviterUserID.Valid && entry.inviterUserID.Int64 > 0 && entry.inviterUserID.Int64 != entry.userID && entry.usageLogID > 0 {
				referralUpdates = append(referralUpdates, referralUpdate{
					usageLogID:    entry.usageLogID,
					inviterUserID: entry.inviterUserID.Int64,
					inviteeUserID: entry.userID,
					billedUSD:     entry.deltaUSD,
				})
			}

		case BillingTypeSubscription:
			// subscription_id can become NULL if the subscription record was deleted (FK ON DELETE SET NULL).
			if !entry.subscriptionID.Valid || entry.subscriptionID.Int64 == 0 {
				_ = s.usageLogRepo.MarkBillingUsageEntryApplied(txCtx, entryID)
				result.Orphaned++
				continue
			}

			if err := s.userSubRepo.IncrementUsage(txCtx, entry.subscriptionID.Int64, entry.deltaUSD); err != nil {
				// Subscription is gone: mark applied to avoid infinite reconcile loops; operators can inspect via logs/DB.
				if errors.Is(err, ErrSubscriptionNotFound) {
					_ = s.usageLogRepo.MarkBillingUsageEntryApplied(txCtx, entryID)
					result.Orphaned++
					continue
				}
				result.Errors++
				continue
			}
			if err := s.usageLogRepo.MarkBillingUsageEntryApplied(txCtx, entryID); err != nil {
				result.Errors++
				continue
			}
			result.Applied++
			var gid *int64
			if entry.groupID.Valid && entry.groupID.Int64 != 0 {
				v := entry.groupID.Int64
				gid = &v
			}
			cacheUpdates = append(cacheUpdates, cacheUpdate{
				userID:      entry.userID,
				groupID:     gid,
				billingType: bt,
				deltaUSD:    entry.deltaUSD,
			})
			if entry.inviterUserID.Valid && entry.inviterUserID.Int64 > 0 && entry.inviterUserID.Int64 != entry.userID && entry.usageLogID > 0 {
				referralUpdates = append(referralUpdates, referralUpdate{
					usageLogID:    entry.usageLogID,
					inviterUserID: entry.inviterUserID.Int64,
					inviteeUserID: entry.userID,
					billedUSD:     entry.deltaUSD,
				})
			}

		default:
			// Unknown billing type: mark applied to avoid repeated loops; this should be investigated.
			_ = s.usageLogRepo.MarkBillingUsageEntryApplied(txCtx, entryID)
			result.Orphaned++
		}
	}

	if err := tx.Commit(); err != nil {
		return BillingReconcileResult{}, err
	}

	// Cache updates are best-effort and must happen after commit.
	if s.billingCacheService != nil {
		for _, u := range cacheUpdates {
			switch u.billingType {
			case BillingTypeBalance:
				s.billingCacheService.QueueDeductBalance(u.userID, u.deltaUSD)
			case BillingTypeSubscription:
				if u.groupID != nil {
					s.billingCacheService.QueueUpdateSubscriptionUsage(u.userID, *u.groupID, u.deltaUSD)
				}
			}
		}
	}

	// Referral commission is best-effort and must happen after commit.
	for _, r := range referralUpdates {
		applyReferralCommissionBestEffort(ctx, s.entClient, &s.referralRateCache, s.billingCacheService, r.usageLogID, r.inviterUserID, r.inviteeUserID, r.billedUSD)
	}

	return result, nil
}
