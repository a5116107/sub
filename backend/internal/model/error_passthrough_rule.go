// Package model defines cross-layer data models.
package model

import (
	"strings"
	"time"
)

// ErrorPassthroughRule defines a global upstream-error passthrough rule.
type ErrorPassthroughRule struct {
	ID              int64     `json:"id"`
	Name            string    `json:"name"`
	Enabled         bool      `json:"enabled"`
	Priority        int       `json:"priority"`
	ErrorCodes      []int     `json:"error_codes"`
	Keywords        []string  `json:"keywords"`
	MatchMode       string    `json:"match_mode"`
	Platforms       []string  `json:"platforms"`
	PassthroughCode bool      `json:"passthrough_code"`
	ResponseCode    *int      `json:"response_code"`
	PassthroughBody bool      `json:"passthrough_body"`
	CustomMessage   *string   `json:"custom_message"`
	Description     *string   `json:"description"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

const (
	MatchModeAny = "any"
	MatchModeAll = "all"
)

const (
	PlatformAnthropic   = "anthropic"
	PlatformOpenAI      = "openai"
	PlatformGemini      = "gemini"
	PlatformAntigravity = "antigravity"
	PlatformQwen        = "qwen"
	PlatformIFlow       = "iflow"
)

// AllPlatforms returns all supported platform identifiers.
func AllPlatforms() []string {
	return []string{
		PlatformAnthropic,
		PlatformOpenAI,
		PlatformGemini,
		PlatformAntigravity,
		PlatformQwen,
		PlatformIFlow,
	}
}

// Validate validates rule content.
func (r *ErrorPassthroughRule) Validate() error {
	if strings.TrimSpace(r.Name) == "" {
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
	if !r.PassthroughBody && (r.CustomMessage == nil || strings.TrimSpace(*r.CustomMessage) == "") {
		return &ValidationError{Field: "custom_message", Message: "custom_message is required when passthrough_body is false"}
	}
	return nil
}

// ValidationError indicates a model validation failure.
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return e.Field + ": " + e.Message
}
