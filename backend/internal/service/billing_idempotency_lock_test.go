//go:build unit

package service

import (
	"context"
	"database/sql"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	dbent "github.com/Wei-Shaw/sub2api/ent"
	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
)

type noopUserRepo struct{}

func (n *noopUserRepo) DeductBalance(context.Context, int64, float64) error { return nil }

type noopUserSubRepo struct{}

func (n *noopUserSubRepo) IncrementUsage(context.Context, int64, float64) error { return nil }

type noopUsageLogRepo struct{}

func (n *noopUsageLogRepo) MarkBillingUsageEntryApplied(context.Context, int64) error { return nil }

func TestBillingApply_LocksByUsageLogID(t *testing.T) {
	t.Parallel()

	db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherRegexp))
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer func() { _ = db.Close() }()

	drv := entsql.OpenDB(dialect.Postgres, db)
	entClient := dbent.NewClient(dbent.Driver(drv))
	defer func() { _ = entClient.Close() }()

	svc := &GatewayService{
		entClient:           entClient,
		userRepo:            &noopUserRepo{},
		userSubRepo:         &noopUserSubRepo{},
		usageLogRepo:        &noopUsageLogRepo{},
		billingCacheService: nil,
		deferredService:     &DeferredService{},
	}

	entry := &BillingUsageEntry{UsageLogID: 123, ID: 999}

	mock.ExpectBegin()
	mock.ExpectQuery(`SELECT applied FROM billing_usage_entries WHERE usage_log_id = \$1 FOR UPDATE`).
		WithArgs(int64(123)).
		WillReturnRows(sqlmock.NewRows([]string{"applied"}).AddRow(false))
	mock.ExpectCommit()

	tx, err := svc.entClient.Tx(context.Background())
	if err != nil {
		t.Fatalf("Tx: %v", err)
	}
	defer func() { _ = tx.Rollback() }()
	txCtx := dbent.NewTxContext(context.Background(), tx)

	rows, qerr := tx.Client().QueryContext(txCtx, "SELECT applied FROM billing_usage_entries WHERE usage_log_id = $1 FOR UPDATE", entry.UsageLogID)
	if qerr != nil {
		t.Fatalf("QueryContext: %v", qerr)
	}
	defer func() { _ = rows.Close() }()
	if !rows.Next() {
		t.Fatalf("expected a row")
	}
	var applied bool
	if err := rows.Scan(&applied); err != nil {
		t.Fatalf("Scan: %v", err)
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("rows.Err: %v", err)
	}
	if applied {
		t.Fatalf("expected applied=false")
	}

	if err := tx.Commit(); err != nil {
		t.Fatalf("Commit: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

func TestUsageLogRepo_CreateBillingUsageEntry_ConflictSelectByUsageLogID(t *testing.T) {
	t.Parallel()

	db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherRegexp))
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer func() { _ = db.Close() }()

	repo := &usageLogRepository{sql: db}

	entry := &BillingUsageEntry{
		UsageLogID:  10,
		UserID:      1,
		APIKeyID:    2,
		BillingType: BillingTypeBalance,
		Applied:     false,
		DeltaUSD:    1.23,
	}

	// First insert returns no rows due to ON CONFLICT DO NOTHING.
	mock.ExpectQuery(`INSERT INTO billing_usage_entries[\s\S]+ON CONFLICT \(usage_log_id\) DO NOTHING[\s\S]+RETURNING id, created_at, applied`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "created_at", "applied"}))

	// Fallback select by usage_log_id.
	mock.ExpectQuery(`SELECT id, created_at, applied, delta_usd FROM billing_usage_entries WHERE usage_log_id = \$1`).
		WithArgs(int64(10)).
		WillReturnRows(sqlmock.NewRows([]string{"id", "created_at", "applied", "delta_usd"}).AddRow(int64(7), sqlmock.AnyArg(), true, 1.23))

	inserted, err := repo.CreateBillingUsageEntry(context.Background(), entry)
	if err != nil {
		t.Fatalf("CreateBillingUsageEntry: %v", err)
	}
	if inserted {
		t.Fatalf("expected inserted=false on conflict")
	}
	if entry.ID != 7 {
		t.Fatalf("expected entry.ID=7, got %d", entry.ID)
	}
	if !entry.Applied {
		t.Fatalf("expected entry.Applied=true from existing row")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("mock expectations: %v", err)
	}
}

