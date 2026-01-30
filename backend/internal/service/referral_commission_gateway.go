package service

import (
	"context"
	"log"
	"strconv"
	"strings"
	"sync"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
)

const referralCommissionRateCacheTTL = 30 * time.Second

type referralCommissionRateCache struct {
	mu          sync.Mutex
	value       float64
	nextRefresh time.Time
}

func normalizeReferralCommissionRate(raw string) float64 {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	v, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return 0
	}
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}

func (c *referralCommissionRateCache) Get(ctx context.Context, client *dbent.Client) float64 {
	if client == nil {
		return 0
	}

	now := time.Now()
	c.mu.Lock()
	if now.Before(c.nextRefresh) {
		v := c.value
		c.mu.Unlock()
		return v
	}
	c.mu.Unlock()

	v := func() float64 {
		rows, err := client.QueryContext(ctx, "SELECT value FROM settings WHERE key = $1 LIMIT 1", SettingKeyReferralCommissionRate)
		if err != nil {
			return 0
		}
		defer func() { _ = rows.Close() }()
		if !rows.Next() {
			_ = rows.Err()
			return 0
		}
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return 0
		}
		return normalizeReferralCommissionRate(raw)
	}()

	c.mu.Lock()
	c.value = v
	c.nextRefresh = now.Add(referralCommissionRateCacheTTL)
	c.mu.Unlock()

	return v
}

func applyReferralCommissionBestEffort(
	ctx context.Context,
	entClient *dbent.Client,
	rateCache *referralCommissionRateCache,
	billingCacheService *BillingCacheService,
	usageLogID int64,
	inviterUserID int64,
	inviteeUserID int64,
	billedUSD float64,
) {
	if entClient == nil || rateCache == nil {
		return
	}
	if usageLogID <= 0 || inviterUserID <= 0 || inviteeUserID <= 0 || inviterUserID == inviteeUserID {
		return
	}
	if billedUSD <= 0 {
		return
	}

	ctx2, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	rate := rateCache.Get(ctx2, entClient)
	if rate <= 0 {
		return
	}
	commissionAmount := billedUSD * rate
	if commissionAmount <= 0 {
		return
	}

	tx, err := entClient.Tx(ctx2)
	if err != nil {
		log.Printf("Apply referral commission: begin tx failed: %v", err)
		return
	}
	defer func() { _ = tx.Rollback() }()

	query := `
WITH inviter AS (
	SELECT id FROM users WHERE id = $2 AND status = $5
),
ins AS (
	INSERT INTO referral_commissions (usage_log_id, inviter_user_id, invitee_user_id, amount, created_at)
	SELECT $1, $2, $3, $4, NOW()
	FROM inviter
	WHERE $2 <> $3 AND $4 > 0
	ON CONFLICT (usage_log_id) DO NOTHING
	RETURNING amount
)
UPDATE users
SET balance = balance + (SELECT amount FROM ins)
WHERE id = $2 AND EXISTS (SELECT 1 FROM ins)
`

	res, err := tx.Client().ExecContext(ctx2, query, usageLogID, inviterUserID, inviteeUserID, commissionAmount, StatusActive)
	if err != nil {
		log.Printf("Apply referral commission: exec failed: %v", err)
		return
	}

	credited := false
	if res != nil {
		if n, err := res.RowsAffected(); err == nil && n > 0 {
			credited = true
		}
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Apply referral commission: commit failed: %v", err)
		return
	}

	if credited && billingCacheService != nil {
		// QueueDeductBalance subtracts amount from cached balance; passing a negative amount credits balance.
		billingCacheService.QueueDeductBalance(inviterUserID, -commissionAmount)
	}
}
