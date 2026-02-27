// Package model defines service-level data models.
package model

import "time"

// ErrorPassthroughRule controls how upstream errors are returned to clients.
//
// Rules are evaluated by priority (smaller value wins). The first match is applied.
type ErrorPassthroughRule struct {
	ID              int64     `json:"id"`
	Name            string    `json:"name"`
	Enabled         bool      `json:"enabled"`
	Priority        int       `json:"priority"`
	ErrorCodes      []int     `json:"error_codes"`
	Keywords        []string  `json:"keywords"`
	MatchMode       string    `json:"match_mode"`        // "any" or "all"
	Platforms       []string  `json:"platforms"`         // empty means all platforms
	PassthroughCode bool      `json:"passthrough_code"`  // true: use upstream status
	ResponseCode    *int      `json:"response_code"`     // when passthrough_code=false
	PassthroughBody bool      `json:"passthrough_body"`  // true: use upstream body message
	CustomMessage   *string   `json:"custom_message"`    // when passthrough_body=false
	SkipMonitoring  bool      `json:"skip_monitoring"`   // skip ops monitoring logs when matched
	Description     *string   `json:"description"`       // optional
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

const (
	MatchModeAny = "any"
	MatchModeAll = "all"
)

func (r *ErrorPassthroughRule) Validate() error {
	if r == nil {
		return &ValidationError{Field: "rule", Message: "rule is required"}
	}
	if r.Name == "" {
		return &ValidationError{Field: "name", Message: "name is required"}
	}
	if r.MatchMode != MatchModeAny && r.MatchMode != MatchModeAll {
		return &ValidationError{Field: "match_mode", Message: "match_mode must be 'any' or 'all'"}
	}
	if len(r.ErrorCodes) == 0 && len(r.Keywords) == 0 {
		return &ValidationError{Field: "conditions", Message: "at least one error_code or keyword is required"}
	}
	if !r.PassthroughCode && (r.ResponseCode == nil || *r.ResponseCode <= 0) {
		return &ValidationError{Field: "response_code", Message: "response_code is required when passthrough_code is false"}
	}
	if !r.PassthroughBody && (r.CustomMessage == nil || *r.CustomMessage == "") {
		return &ValidationError{Field: "custom_message", Message: "custom_message is required when passthrough_body is false"}
	}
	return nil
}

// ValidationError represents a validation error for API requests.
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return e.Field + ": " + e.Message
}

