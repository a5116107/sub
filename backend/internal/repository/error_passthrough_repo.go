package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/model"
	"github.com/Wei-Shaw/sub2api/internal/service"
)

// SQL-backed repository for error_passthrough_rules.
//
// This avoids ent schema/codegen churn while keeping the feature persistent.
type errorPassthroughRepository struct {
	db *sql.DB
}

func NewErrorPassthroughRepository(db *sql.DB) service.ErrorPassthroughRepository {
	return &errorPassthroughRepository{db: db}
}

const errorPassthroughSelectCols = `
id, name, enabled, priority,
error_codes, keywords, match_mode, platforms,
passthrough_code, response_code, passthrough_body, custom_message,
skip_monitoring, description,
created_at, updated_at
`

func (r *errorPassthroughRepository) List(ctx context.Context) ([]*model.ErrorPassthroughRule, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT "+errorPassthroughSelectCols+" FROM error_passthrough_rules ORDER BY priority ASC, id ASC",
	)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	var out []*model.ErrorPassthroughRule
	for rows.Next() {
		rule, err := scanErrorPassthroughRule(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, rule)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *errorPassthroughRepository) GetByID(ctx context.Context, id int64) (*model.ErrorPassthroughRule, error) {
	row := r.db.QueryRowContext(ctx, "SELECT "+errorPassthroughSelectCols+" FROM error_passthrough_rules WHERE id = $1", id)
	rule, err := scanErrorPassthroughRule(row)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return rule, nil
}

func (r *errorPassthroughRepository) Create(ctx context.Context, rule *model.ErrorPassthroughRule) (*model.ErrorPassthroughRule, error) {
	now := time.Now()

	errorCodesJSON, err := json.Marshal(rule.ErrorCodes)
	if err != nil {
		return nil, fmt.Errorf("marshal error_codes: %w", err)
	}
	keywordsJSON, err := json.Marshal(rule.Keywords)
	if err != nil {
		return nil, fmt.Errorf("marshal keywords: %w", err)
	}
	platformsJSON, err := json.Marshal(rule.Platforms)
	if err != nil {
		return nil, fmt.Errorf("marshal platforms: %w", err)
	}

	var (
		id            int64
		responseCode  sql.NullInt64
		customMessage sql.NullString
		description   sql.NullString
		createdAt     time.Time
		updatedAt     time.Time
	)

	if rule.ResponseCode != nil {
		responseCode = sql.NullInt64{Int64: int64(*rule.ResponseCode), Valid: true}
	}
	if rule.CustomMessage != nil {
		customMessage = sql.NullString{String: *rule.CustomMessage, Valid: true}
	}
	if rule.Description != nil {
		description = sql.NullString{String: *rule.Description, Valid: true}
	}

	err = r.db.QueryRowContext(ctx, `
INSERT INTO error_passthrough_rules (
  name, enabled, priority,
  error_codes, keywords, match_mode, platforms,
  passthrough_code, response_code, passthrough_body, custom_message,
  skip_monitoring, description,
  created_at, updated_at
) VALUES (
  $1, $2, $3,
  $4, $5, $6, $7,
  $8, $9, $10, $11,
  $12, $13,
  $14, $15
)
RETURNING id, created_at, updated_at, response_code, custom_message, description
`,
		rule.Name, rule.Enabled, rule.Priority,
		errorCodesJSON, keywordsJSON, rule.MatchMode, platformsJSON,
		rule.PassthroughCode, responseCode, rule.PassthroughBody, customMessage,
		rule.SkipMonitoring, description,
		now, now,
	).Scan(&id, &createdAt, &updatedAt, &responseCode, &customMessage, &description)
	if err != nil {
		return nil, err
	}

	created := *rule
	created.ID = id
	created.CreatedAt = createdAt
	created.UpdatedAt = updatedAt
	if responseCode.Valid {
		v := int(responseCode.Int64)
		created.ResponseCode = &v
	} else {
		created.ResponseCode = nil
	}
	if customMessage.Valid {
		v := customMessage.String
		created.CustomMessage = &v
	} else {
		created.CustomMessage = nil
	}
	if description.Valid {
		v := description.String
		created.Description = &v
	} else {
		created.Description = nil
	}
	normalizeErrorPassthroughRuleSlices(&created)
	return &created, nil
}

func (r *errorPassthroughRepository) Update(ctx context.Context, rule *model.ErrorPassthroughRule) (*model.ErrorPassthroughRule, error) {
	now := time.Now()

	errorCodesJSON, err := json.Marshal(rule.ErrorCodes)
	if err != nil {
		return nil, fmt.Errorf("marshal error_codes: %w", err)
	}
	keywordsJSON, err := json.Marshal(rule.Keywords)
	if err != nil {
		return nil, fmt.Errorf("marshal keywords: %w", err)
	}
	platformsJSON, err := json.Marshal(rule.Platforms)
	if err != nil {
		return nil, fmt.Errorf("marshal platforms: %w", err)
	}

	var (
		responseCode  sql.NullInt64
		customMessage sql.NullString
		description   sql.NullString
		createdAt     time.Time
		updatedAt     time.Time
	)

	if rule.ResponseCode != nil {
		responseCode = sql.NullInt64{Int64: int64(*rule.ResponseCode), Valid: true}
	}
	if rule.CustomMessage != nil {
		customMessage = sql.NullString{String: *rule.CustomMessage, Valid: true}
	}
	if rule.Description != nil {
		description = sql.NullString{String: *rule.Description, Valid: true}
	}

	res, err := r.db.ExecContext(ctx, `
UPDATE error_passthrough_rules
SET
  name = $1,
  enabled = $2,
  priority = $3,
  error_codes = $4,
  keywords = $5,
  match_mode = $6,
  platforms = $7,
  passthrough_code = $8,
  response_code = $9,
  passthrough_body = $10,
  custom_message = $11,
  skip_monitoring = $12,
  description = $13,
  updated_at = $14
WHERE id = $15
`,
		rule.Name,
		rule.Enabled,
		rule.Priority,
		errorCodesJSON,
		keywordsJSON,
		rule.MatchMode,
		platformsJSON,
		rule.PassthroughCode,
		responseCode,
		rule.PassthroughBody,
		customMessage,
		rule.SkipMonitoring,
		description,
		now,
		rule.ID,
	)
	if err != nil {
		return nil, err
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		return nil, nil
	}

	// Reload for timestamps and normalized nullable fields.
	updated, err := r.GetByID(ctx, rule.ID)
	if err != nil {
		return nil, err
	}
	if updated == nil {
		// Fallback: echo provided rule.
		clone := *rule
		clone.CreatedAt = createdAt
		clone.UpdatedAt = updatedAt
		normalizeErrorPassthroughRuleSlices(&clone)
		return &clone, nil
	}
	return updated, nil
}

func (r *errorPassthroughRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM error_passthrough_rules WHERE id = $1", id)
	return err
}

type errorPassthroughRowScanner interface {
	Scan(dest ...any) error
}

func scanErrorPassthroughRule(s errorPassthroughRowScanner) (*model.ErrorPassthroughRule, error) {
	var (
		id              int64
		name            string
		enabled         bool
		priority        int
		errorCodesRaw   []byte
		keywordsRaw     []byte
		matchMode       string
		platformsRaw    []byte
		passthroughCode bool
		responseCode    sql.NullInt64
		passthroughBody bool
		customMessage   sql.NullString
		skipMonitoring  bool
		description     sql.NullString
		createdAt       time.Time
		updatedAt       time.Time
	)

	if err := s.Scan(
		&id,
		&name,
		&enabled,
		&priority,
		&errorCodesRaw,
		&keywordsRaw,
		&matchMode,
		&platformsRaw,
		&passthroughCode,
		&responseCode,
		&passthroughBody,
		&customMessage,
		&skipMonitoring,
		&description,
		&createdAt,
		&updatedAt,
	); err != nil {
		return nil, err
	}

	var errorCodes []int
	var keywords []string
	var platforms []string
	_ = json.Unmarshal(errorCodesRaw, &errorCodes)
	_ = json.Unmarshal(keywordsRaw, &keywords)
	_ = json.Unmarshal(platformsRaw, &platforms)

	rule := &model.ErrorPassthroughRule{
		ID:              id,
		Name:            name,
		Enabled:         enabled,
		Priority:        priority,
		ErrorCodes:      errorCodes,
		Keywords:        keywords,
		MatchMode:       matchMode,
		Platforms:       platforms,
		PassthroughCode: passthroughCode,
		PassthroughBody: passthroughBody,
		SkipMonitoring:  skipMonitoring,
		CreatedAt:       createdAt,
		UpdatedAt:       updatedAt,
	}

	if responseCode.Valid {
		v := int(responseCode.Int64)
		rule.ResponseCode = &v
	}
	if customMessage.Valid {
		v := customMessage.String
		rule.CustomMessage = &v
	}
	if description.Valid {
		v := description.String
		rule.Description = &v
	}
	normalizeErrorPassthroughRuleSlices(rule)
	return rule, nil
}

func normalizeErrorPassthroughRuleSlices(rule *model.ErrorPassthroughRule) {
	if rule == nil {
		return
	}
	if rule.ErrorCodes == nil {
		rule.ErrorCodes = []int{}
	}
	if rule.Keywords == nil {
		rule.Keywords = []string{}
	}
	if rule.Platforms == nil {
		rule.Platforms = []string{}
	}
}

