package service

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	dbent "github.com/Wei-Shaw/sub2api/ent"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
)

type reconcileUserRepoStub struct {
	calls int
}

func (s *reconcileUserRepoStub) DeductBalance(ctx context.Context, id int64, amount float64) error {
	s.calls++
	return nil
}

type reconcileUserSubRepoStub struct{}

func (s *reconcileUserSubRepoStub) IncrementUsage(ctx context.Context, id int64, costUSD float64) error {
	return nil
}

type reconcileUsageLogRepoStub struct {
	appliedIDs []int64
}

func (s *reconcileUsageLogRepoStub) MarkBillingUsageEntryApplied(ctx context.Context, id int64) error {
	s.appliedIDs = append(s.appliedIDs, id)
	return nil
}

func TestBillingReconcileService_ReconcileOnce_AppliesReferralCommissionBestEffort(t *testing.T) {
	t.Parallel()

	now := time.Now()

	db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherRegexp))
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer func() { _ = db.Close() }()

	drv := entsql.OpenDB(dialect.Postgres, db)
	entClient := dbent.NewClient(dbent.Driver(drv))
	defer func() { _ = entClient.Close() }()

	userRepo := &reconcileUserRepoStub{}
	userSubRepo := &reconcileUserSubRepoStub{}
	usageLogRepo := &reconcileUsageLogRepoStub{}

	svc := NewBillingReconcileService(entClient, userRepo, userSubRepo, usageLogRepo, nil, nil)

	// First tx: pick unapplied billing entry.
	mock.ExpectBegin()
	mock.ExpectQuery(`SELECT[\s\S]+FROM billing_usage_entries b[\s\S]+FOR UPDATE SKIP LOCKED`).
		WithArgs(200).
		WillReturnRows(
			sqlmock.NewRows([]string{
				"id",
				"usage_log_id",
				"user_id",
				"api_key_id",
				"invited_by_user_id",
				"subscription_id",
				"billing_type",
				"delta_usd",
				"group_id",
			}).AddRow(
				int64(1),        // id
				int64(100),      // usage_log_id
				int64(10),       // user_id (invitee)
				int64(3),        // api_key_id
				int64(20),       // invited_by_user_id (inviter)
				sql.NullInt64{}, // subscription_id
				int16(0),        // billing_type (balance)
				10.0,            // delta_usd
				sql.NullInt64{}, // group_id
			),
		)
	mock.ExpectExec(`UPDATE[\s\S]+api_keys[\s\S]+quota_used_usd[\s\S]+`).
		WillReturnResult(sqlmock.NewResult(0, 1))
	// ent UpdateOne(...).Exec fetches the updated row (Save returns a node).
	mock.ExpectQuery(`SELECT[\s\S]+FROM "api_keys" WHERE "id" = \$1`).
		WithArgs(int64(3)).
		WillReturnRows(
			sqlmock.NewRows([]string{
				"id",
				"created_at",
				"updated_at",
				"deleted_at",
				"user_id",
				"key",
				"name",
				"group_id",
				"status",
				"ip_whitelist",
				"ip_blacklist",
				"allow_balance",
				"allow_subscription",
				"subscription_strict",
				"expires_at",
				"quota_limit_usd",
				"quota_used_usd",
			}).AddRow(
				int64(3),
				now,
				now,
				nil, // deleted_at
				int64(10),
				"k",
				"key-1",
				int64(1),
				StatusActive,
				[]byte("[]"),
				[]byte("[]"),
				true,
				true,
				false,
				nil, // expires_at
				nil, // quota_limit_usd
				10.0,
			),
		)
	mock.ExpectCommit()

	// Rate cache fetch (non-tx query).
	mock.ExpectQuery(`SELECT value FROM settings WHERE key = \$1 LIMIT 1`).
		WithArgs(SettingKeyReferralCommissionRate).
		WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow("0.1"))

	// Referral commission tx.
	mock.ExpectBegin()
	mock.ExpectExec(`WITH inviter AS \([\s\S]+UPDATE users[\s\S]+\)`).
		WithArgs(int64(100), int64(20), int64(10), 1.0, StatusActive).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	res, err := svc.ReconcileOnce(context.Background(), 200)
	if err != nil {
		t.Fatalf("ReconcileOnce: %v", err)
	}
	if res.Applied != 1 {
		t.Fatalf("Applied=%d, want 1", res.Applied)
	}
	if userRepo.calls != 1 {
		t.Fatalf("DeductBalance calls=%d, want 1", userRepo.calls)
	}
	if len(usageLogRepo.appliedIDs) != 1 || usageLogRepo.appliedIDs[0] != 1 {
		t.Fatalf("MarkBillingUsageEntryApplied ids=%v, want [1]", usageLogRepo.appliedIDs)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sqlmock expectations: %v", err)
	}
}
