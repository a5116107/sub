//go:build unit

package repository

import (
	"context"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/Wei-Shaw/sub2api/internal/service"
)

func TestUsageLogRepo_CreateBillingUsageEntry_ConflictSelectByUsageLogID(t *testing.T) {
	t.Parallel()

	db, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherRegexp))
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer func() { _ = db.Close() }()

	repo := newUsageLogRepositoryWithSQL(nil, db)

	entry := &service.BillingUsageEntry{
		UsageLogID:  10,
		UserID:      1,
		APIKeyID:    2,
		BillingType: service.BillingTypeBalance,
		Applied:     false,
		DeltaUSD:    1.23,
	}

	// First insert returns no rows due to ON CONFLICT DO NOTHING.
	mock.ExpectQuery(`INSERT INTO billing_usage_entries[\s\S]+ON CONFLICT \(usage_log_id\) DO NOTHING[\s\S]+RETURNING id, created_at, applied`).
		WillReturnRows(sqlmock.NewRows([]string{"id", "created_at", "applied"}))

	// Fallback select by usage_log_id.
	mock.ExpectQuery(`SELECT id, created_at, applied, delta_usd FROM billing_usage_entries WHERE usage_log_id = \$1`).
		WithArgs(int64(10)).
		WillReturnRows(sqlmock.NewRows([]string{"id", "created_at", "applied", "delta_usd"}).AddRow(int64(7), time.Unix(0, 0).UTC(), true, 1.23))

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
