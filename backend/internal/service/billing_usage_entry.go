package service

import "time"

// BillingUsageEntry represents an idempotent billing ledger entry tied to a usage log.
//
// It is used to ensure billing is applied at most once per usage_log_id.
type BillingUsageEntry struct {
	ID             int64
	UsageLogID     int64
	UserID         int64
	APIKeyID       int64
	SubscriptionID *int64

	BillingType int8
	Applied     bool
	DeltaUSD    float64

	CreatedAt time.Time
}
