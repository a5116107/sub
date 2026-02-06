package payloadrules

import (
	"encoding/json"
	"sort"
	"strings"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

// Protocol names for gateway payload rule matching.
// These describe the on-wire payload format at the gateway boundary.
const (
	ProtocolAnthropicMessages     = "anthropic_messages"
	ProtocolOpenAIResponses       = "openai_responses"
	ProtocolOpenAIChatCompletions = "openai_chat_completions"
	ProtocolGeminiV1Beta          = "gemini_v1beta"
	ProtocolGeminiV1Internal      = "gemini_v1internal"
)

type Engine struct {
	defaultRules     []compiledRule
	defaultRawRules  []compiledRule
	overrideRules    []compiledRule
	overrideRawRules []compiledRule
}

type CompileResult struct {
	Warnings []string
}

func NewEngine(cfg config.GatewayPayloadRulesConfig) (*Engine, CompileResult) {
	var out Engine
	var res CompileResult

	out.defaultRules = compileRules(cfg.Default, "default", &res)
	out.defaultRawRules = compileRules(cfg.DefaultRaw, "default_raw", &res)
	out.overrideRules = compileRules(cfg.Override, "override", &res)
	out.overrideRawRules = compileRules(cfg.OverrideRaw, "override_raw", &res)

	return &out, res
}

func (e *Engine) HasRules() bool {
	if e == nil {
		return false
	}
	return len(e.defaultRules) > 0 || len(e.defaultRawRules) > 0 || len(e.overrideRules) > 0 || len(e.overrideRawRules) > 0
}

type ApplyInput struct {
	Protocol string
	Path     string
	Model    string
	Payload  []byte
}

type ApplyStats struct {
	MatchedRules     int
	AppliedDefaults  int
	AppliedOverrides int
	Changed          bool
}

func (e *Engine) Apply(input ApplyInput) ([]byte, ApplyStats) {
	if e == nil {
		return input.Payload, ApplyStats{}
	}
	if len(input.Payload) == 0 {
		return input.Payload, ApplyStats{}
	}
	model := strings.TrimSpace(input.Model)
	if model == "" {
		return input.Payload, ApplyStats{}
	}

	protocol := strings.ToLower(strings.TrimSpace(input.Protocol))
	path := strings.TrimSpace(input.Path)

	source := input.Payload
	out := input.Payload
	stats := ApplyStats{}

	appliedDefaults := make(map[string]struct{})

	// Apply default rules: first write wins per field across all matching rules.
	for _, rule := range e.defaultRules {
		if !rule.matches(protocol, model, path) {
			continue
		}
		stats.MatchedRules++
		for _, key := range rule.paramKeys {
			if key == "" {
				continue
			}
			if gjson.GetBytes(source, key).Exists() {
				continue
			}
			if _, ok := appliedDefaults[key]; ok {
				continue
			}
			value, ok := rule.params[key]
			if !ok {
				continue
			}
			updated, errSet := sjson.SetBytes(out, key, value)
			if errSet != nil {
				continue
			}
			out = updated
			appliedDefaults[key] = struct{}{}
			stats.AppliedDefaults++
			stats.Changed = true
		}
	}

	// Apply default raw rules: first write wins per field across all matching rules.
	for _, rule := range e.defaultRawRules {
		if !rule.matches(protocol, model, path) {
			continue
		}
		stats.MatchedRules++
		for _, key := range rule.paramKeys {
			if key == "" {
				continue
			}
			if gjson.GetBytes(source, key).Exists() {
				continue
			}
			if _, ok := appliedDefaults[key]; ok {
				continue
			}
			value, ok := rule.params[key]
			if !ok {
				continue
			}
			rawValue, ok := payloadRawValue(value)
			if !ok {
				continue
			}
			updated, errSet := sjson.SetRawBytes(out, key, rawValue)
			if errSet != nil {
				continue
			}
			out = updated
			appliedDefaults[key] = struct{}{}
			stats.AppliedDefaults++
			stats.Changed = true
		}
	}

	// Apply override rules: last write wins per field across all matching rules.
	for _, rule := range e.overrideRules {
		if !rule.matches(protocol, model, path) {
			continue
		}
		stats.MatchedRules++
		for _, key := range rule.paramKeys {
			if key == "" {
				continue
			}
			value, ok := rule.params[key]
			if !ok {
				continue
			}
			updated, errSet := sjson.SetBytes(out, key, value)
			if errSet != nil {
				continue
			}
			out = updated
			stats.AppliedOverrides++
			stats.Changed = true
		}
	}

	// Apply override raw rules: last write wins per field across all matching rules.
	for _, rule := range e.overrideRawRules {
		if !rule.matches(protocol, model, path) {
			continue
		}
		stats.MatchedRules++
		for _, key := range rule.paramKeys {
			if key == "" {
				continue
			}
			value, ok := rule.params[key]
			if !ok {
				continue
			}
			rawValue, ok := payloadRawValue(value)
			if !ok {
				continue
			}
			updated, errSet := sjson.SetRawBytes(out, key, rawValue)
			if errSet != nil {
				continue
			}
			out = updated
			stats.AppliedOverrides++
			stats.Changed = true
		}
	}

	return out, stats
}

type compiledRule struct {
	models    []compiledModel
	paths     []string
	params    map[string]any
	paramKeys []string
}

type compiledModel struct {
	pattern  string
	protocol string
}

func compileRules(rules []config.GatewayPayloadRule, group string, res *CompileResult) []compiledRule {
	if len(rules) == 0 {
		return nil
	}
	out := make([]compiledRule, 0, len(rules))
	for i, rule := range rules {
		compiled, ok := compileRule(rule)
		if !ok {
			if res != nil {
				res.Warnings = append(res.Warnings, "gateway.payload_rules."+group+"["+itoa(i)+"] is invalid; skipping")
			}
			continue
		}
		out = append(out, compiled)
	}
	return out
}

func compileRule(rule config.GatewayPayloadRule) (compiledRule, bool) {
	if len(rule.Models) == 0 {
		return compiledRule{}, false
	}
	if len(rule.Params) == 0 {
		return compiledRule{}, false
	}

	models := make([]compiledModel, 0, len(rule.Models))
	for _, entry := range rule.Models {
		name := strings.TrimSpace(entry.Name)
		if name == "" {
			continue
		}
		protocol := strings.ToLower(strings.TrimSpace(entry.Protocol))
		models = append(models, compiledModel{pattern: name, protocol: protocol})
	}
	if len(models) == 0 {
		return compiledRule{}, false
	}

	paths := make([]string, 0, len(rule.Paths))
	for _, p := range rule.Paths {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		paths = append(paths, p)
	}

	params := make(map[string]any, len(rule.Params))
	for k, v := range rule.Params {
		key := strings.TrimSpace(k)
		if key == "" {
			continue
		}
		params[key] = v
	}
	if len(params) == 0 {
		return compiledRule{}, false
	}

	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	return compiledRule{
		models:    models,
		paths:     paths,
		params:    params,
		paramKeys: keys,
	}, true
}

func (r compiledRule) matches(protocol, model, path string) bool {
	if len(r.paths) > 0 {
		matchedPath := false
		for _, prefix := range r.paths {
			if strings.HasPrefix(path, prefix) {
				matchedPath = true
				break
			}
		}
		if !matchedPath {
			return false
		}
	}

	for _, entry := range r.models {
		if entry.protocol != "" {
			if protocol == "" {
				continue
			}
			if entry.protocol != protocol {
				continue
			}
		}
		if matchModelPattern(entry.pattern, model) {
			return true
		}
	}
	return false
}

func payloadRawValue(value any) ([]byte, bool) {
	if value == nil {
		return nil, false
	}
	switch typed := value.(type) {
	case string:
		return []byte(typed), true
	case []byte:
		return typed, true
	default:
		raw, errMarshal := json.Marshal(typed)
		if errMarshal != nil {
			return nil, false
		}
		return raw, true
	}
}

// matchModelPattern performs simple wildcard matching where '*' matches zero or more characters.
func matchModelPattern(pattern, model string) bool {
	pattern = strings.TrimSpace(pattern)
	model = strings.TrimSpace(model)
	if pattern == "" {
		return false
	}
	if pattern == "*" {
		return true
	}

	// Iterative glob-style matcher supporting only '*' wildcard.
	pi, si := 0, 0
	starIdx := -1
	matchIdx := 0
	for si < len(model) {
		if pi < len(pattern) && pattern[pi] == model[si] {
			pi++
			si++
			continue
		}
		if pi < len(pattern) && pattern[pi] == '*' {
			starIdx = pi
			matchIdx = si
			pi++
			continue
		}
		if starIdx != -1 {
			pi = starIdx + 1
			matchIdx++
			si = matchIdx
			continue
		}
		return false
	}
	for pi < len(pattern) && pattern[pi] == '*' {
		pi++
	}
	return pi == len(pattern)
}

func itoa(v int) string {
	if v == 0 {
		return "0"
	}
	neg := v < 0
	if neg {
		v = -v
	}
	var buf [32]byte
	i := len(buf)
	for v > 0 {
		i--
		buf[i] = byte('0' + v%10)
		v /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
