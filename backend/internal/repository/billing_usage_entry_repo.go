package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/internal/service"
)

func (r *usageLogRepository) CreateBillingUsageEntry(ctx context.Context, entry *service.BillingUsageEntry) (bool, error) {
	if entry == nil {
		return false, nil
	}

	sqlq := r.sql
	if tx := dbent.TxFromContext(ctx); tx != nil {
		sqlq = tx.Client()
	}

	createdAt := entry.CreatedAt
	if createdAt.IsZero() {
		createdAt = time.Now()
	}

	subscriptionID := sql.NullInt64{}
	if entry.SubscriptionID != nil {
		subscriptionID = sql.NullInt64{Int64: *entry.SubscriptionID, Valid: true}
	}

	query := `
		INSERT INTO billing_usage_entries (
			usage_log_id,
			user_id,
			api_key_id,
			subscription_id,
			billing_type,
			applied,
			delta_usd,
			created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (usage_log_id) DO NOTHING
		RETURNING id, created_at, applied
	`

	var applied bool
	args := []any{
		entry.UsageLogID,
		entry.UserID,
		entry.APIKeyID,
		subscriptionID,
		entry.BillingType,
		entry.Applied,
		entry.DeltaUSD,
		createdAt,
	}

	if err := scanSingleRow(ctx, sqlq, query, args, &entry.ID, &entry.CreatedAt, &applied); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			selectQuery := "SELECT id, created_at, applied, delta_usd FROM billing_usage_entries WHERE usage_log_id = $1"
			if err := scanSingleRow(ctx, sqlq, selectQuery, []any{entry.UsageLogID}, &entry.ID, &entry.CreatedAt, &entry.Applied, &entry.DeltaUSD); err != nil {
				return false, err
			}
			return false, nil
		}
		return false, err
	}

	entry.Applied = applied
	return true, nil
}

func (r *usageLogRepository) MarkBillingUsageEntryApplied(ctx context.Context, id int64) error {
	sqlq := r.sql
	if tx := dbent.TxFromContext(ctx); tx != nil {
		sqlq = tx.Client()
	}

	_, err := sqlq.ExecContext(ctx, "UPDATE billing_usage_entries SET applied = TRUE WHERE id = $1", id)
	return err
}
