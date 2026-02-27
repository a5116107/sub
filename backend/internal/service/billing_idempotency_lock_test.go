//go:build unit

package service

import (
	"context"
	"testing"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	"github.com/DATA-DOG/go-sqlmock"
	dbent "github.com/Wei-Shaw/sub2api/ent"
)

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

	entry := &BillingUsageEntry{UsageLogID: 123, ID: 999}

	mock.ExpectBegin()
	mock.ExpectQuery(`SELECT applied FROM billing_usage_entries WHERE usage_log_id = \$1 FOR UPDATE`).
		WithArgs(int64(123)).
		WillReturnRows(sqlmock.NewRows([]string{"applied"}).AddRow(false))
	mock.ExpectCommit()

	tx, err := entClient.Tx(context.Background())
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
