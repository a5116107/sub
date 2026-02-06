package repository

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/Wei-Shaw/sub2api/internal/model"
	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/Wei-Shaw/sub2api/internal/service"
)

type errorPassthroughRepository struct {
	sql *sql.DB
}

// NewErrorPassthroughRepository creates an error-passthrough repository.
func NewErrorPassthroughRepository(sqlDB *sql.DB) service.ErrorPassthroughRepository {
	return &errorPassthroughRepository{sql: sqlDB}
}

func (r *errorPassthroughRepository) List(ctx context.Context) ([]*model.ErrorPassthroughRule, error) {
	rows, err := r.sql.QueryContext(ctx, `
		SELECT id, name, enabled, priority, error_codes, keywords, match_mode, platforms,
		       passthrough_code, response_code, passthrough_body, custom_message, description,
		       created_at, updated_at
		  FROM error_passthrough_rules
		 ORDER BY priority ASC, id ASC`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	out := make([]*model.ErrorPassthroughRule, 0)
	for rows.Next() {
		rule, err := scanErrorPassthroughRule(rows.Scan)
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
	row := r.sql.QueryRowContext(ctx, `
		SELECT id, name, enabled, priority, error_codes, keywords, match_mode, platforms,
		       passthrough_code, response_code, passthrough_body, custom_message, description,
		       created_at, updated_at
		  FROM error_passthrough_rules
		 WHERE id = $1`, id)

	rule, err := scanErrorPassthroughRule(row.Scan)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return rule, nil
}

func (r *errorPassthroughRepository) Create(ctx context.Context, rule *model.ErrorPassthroughRule) (*model.ErrorPassthroughRule, error) {
	errorCodesJSON, keywordsJSON, platformsJSON, err := marshalRuleSlices(rule)
	if err != nil {
		return nil, err
	}

	responseCode := sql.NullInt64{}
	if rule.ResponseCode != nil {
		responseCode = sql.NullInt64{Int64: int64(*rule.ResponseCode), Valid: true}
	}
	customMessage := toNullString(rule.CustomMessage)
	description := toNullString(rule.Description)

	row := r.sql.QueryRowContext(ctx, `
		INSERT INTO error_passthrough_rules (
			name, enabled, priority, error_codes, keywords, match_mode, platforms,
			passthrough_code, response_code, passthrough_body, custom_message, description
		) VALUES (
			$1, $2, $3, $4::jsonb, $5::jsonb, $6, $7::jsonb,
			$8, $9, $10, $11, $12
		)
		RETURNING id, name, enabled, priority, error_codes, keywords, match_mode, platforms,
		          passthrough_code, response_code, passthrough_body, custom_message, description,
		          created_at, updated_at`,
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
		description,
	)

	return scanErrorPassthroughRule(row.Scan)
}

func (r *errorPassthroughRepository) Update(ctx context.Context, rule *model.ErrorPassthroughRule) (*model.ErrorPassthroughRule, error) {
	errorCodesJSON, keywordsJSON, platformsJSON, err := marshalRuleSlices(rule)
	if err != nil {
		return nil, err
	}

	responseCode := sql.NullInt64{}
	if rule.ResponseCode != nil {
		responseCode = sql.NullInt64{Int64: int64(*rule.ResponseCode), Valid: true}
	}
	customMessage := toNullString(rule.CustomMessage)
	description := toNullString(rule.Description)

	row := r.sql.QueryRowContext(ctx, `
		UPDATE error_passthrough_rules
		   SET name = $2,
		       enabled = $3,
		       priority = $4,
		       error_codes = $5::jsonb,
		       keywords = $6::jsonb,
		       match_mode = $7,
		       platforms = $8::jsonb,
		       passthrough_code = $9,
		       response_code = $10,
		       passthrough_body = $11,
		       custom_message = $12,
		       description = $13,
		       updated_at = NOW()
		 WHERE id = $1
		RETURNING id, name, enabled, priority, error_codes, keywords, match_mode, platforms,
		          passthrough_code, response_code, passthrough_body, custom_message, description,
		          created_at, updated_at`,
		rule.ID,
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
		description,
	)

	updated, err := scanErrorPassthroughRule(row.Scan)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, infraerrors.NotFound("error_passthrough_rule_not_found", "error passthrough rule not found")
		}
		return nil, err
	}
	return updated, nil
}

func (r *errorPassthroughRepository) Delete(ctx context.Context, id int64) error {
	result, err := r.sql.ExecContext(ctx, `DELETE FROM error_passthrough_rules WHERE id = $1`, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return infraerrors.NotFound("error_passthrough_rule_not_found", "error passthrough rule not found")
	}
	return nil
}

func scanErrorPassthroughRule(scan func(dest ...any) error) (*model.ErrorPassthroughRule, error) {
	var (
		rule                       model.ErrorPassthroughRule
		errorCodesRaw, keywordsRaw []byte
		platformsRaw               []byte
		responseCode               sql.NullInt64
		customMessage              sql.NullString
		description                sql.NullString
	)

	if err := scan(
		&rule.ID,
		&rule.Name,
		&rule.Enabled,
		&rule.Priority,
		&errorCodesRaw,
		&keywordsRaw,
		&rule.MatchMode,
		&platformsRaw,
		&rule.PassthroughCode,
		&responseCode,
		&rule.PassthroughBody,
		&customMessage,
		&description,
		&rule.CreatedAt,
		&rule.UpdatedAt,
	); err != nil {
		return nil, err
	}

	errorCodes, err := unmarshalIntSlice(errorCodesRaw)
	if err != nil {
		return nil, fmt.Errorf("decode error_codes: %w", err)
	}
	keywords, err := unmarshalStringSlice(keywordsRaw)
	if err != nil {
		return nil, fmt.Errorf("decode keywords: %w", err)
	}
	platforms, err := unmarshalStringSlice(platformsRaw)
	if err != nil {
		return nil, fmt.Errorf("decode platforms: %w", err)
	}
	rule.ErrorCodes = errorCodes
	rule.Keywords = keywords
	rule.Platforms = platforms

	if responseCode.Valid {
		val := int(responseCode.Int64)
		rule.ResponseCode = &val
	}
	if customMessage.Valid {
		val := customMessage.String
		rule.CustomMessage = &val
	}
	if description.Valid {
		val := description.String
		rule.Description = &val
	}

	return &rule, nil
}

func marshalRuleSlices(rule *model.ErrorPassthroughRule) ([]byte, []byte, []byte, error) {
	errorCodes := rule.ErrorCodes
	if errorCodes == nil {
		errorCodes = []int{}
	}
	keywords := rule.Keywords
	if keywords == nil {
		keywords = []string{}
	}
	platforms := rule.Platforms
	if platforms == nil {
		platforms = []string{}
	}

	errorCodesJSON, err := json.Marshal(errorCodes)
	if err != nil {
		return nil, nil, nil, err
	}
	keywordsJSON, err := json.Marshal(keywords)
	if err != nil {
		return nil, nil, nil, err
	}
	platformsJSON, err := json.Marshal(platforms)
	if err != nil {
		return nil, nil, nil, err
	}
	return errorCodesJSON, keywordsJSON, platformsJSON, nil
}

func toNullString(value *string) sql.NullString {
	if value == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *value, Valid: true}
}

func unmarshalIntSlice(raw []byte) ([]int, error) {
	if isEmptyJSONArray(raw) {
		return []int{}, nil
	}
	var out []int
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	if out == nil {
		return []int{}, nil
	}
	return out, nil
}

func unmarshalStringSlice(raw []byte) ([]string, error) {
	if isEmptyJSONArray(raw) {
		return []string{}, nil
	}
	var out []string
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	if out == nil {
		return []string{}, nil
	}
	return out, nil
}

func isEmptyJSONArray(raw []byte) bool {
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 {
		return true
	}
	if bytes.Equal(trimmed, []byte("null")) {
		return true
	}
	return false
}

var _ service.ErrorPassthroughRepository = (*errorPassthroughRepository)(nil)
