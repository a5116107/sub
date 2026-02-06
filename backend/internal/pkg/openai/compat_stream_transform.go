package openai

import (
	"encoding/json"
	"strings"
	"time"
)

type CompatStreamMode int

const (
	CompatStreamModeChatCompletions CompatStreamMode = iota
	CompatStreamModeCompletions
)

// ResponseStreamCompatTransformer converts OpenAI Responses SSE events (data payloads)
// into OpenAI Chat Completions / Completions SSE payloads.
//
// It only handles a minimal subset:
// - response.created
// - response.output_text.delta
// - response.completed / response.done
type ResponseStreamCompatTransformer struct {
	mode     CompatStreamMode
	id       string
	model    string
	created  int64
	sentRole bool
	done     bool
}

func NewResponseStreamCompatTransformer(mode CompatStreamMode) *ResponseStreamCompatTransformer {
	return &ResponseStreamCompatTransformer{mode: mode}
}

// HandleData consumes a single SSE "data: ..." payload string (already stripped of the "data:" prefix)
// and returns zero or more outgoing payloads (without the "data:" prefix).
func (t *ResponseStreamCompatTransformer) HandleData(data string) (payloads []string, done bool) {
	if t.done {
		return nil, true
	}
	data = strings.TrimSpace(data)
	if data == "" {
		return nil, false
	}
	if data == "[DONE]" {
		t.done = true
		return []string{"[DONE]"}, true
	}

	var ev map[string]any
	if err := json.Unmarshal([]byte(data), &ev); err != nil {
		// Unknown payload: drop.
		return nil, false
	}

	// Preserve error payloads.
	if _, ok := ev["error"]; ok {
		return []string{data}, false
	}

	eventType, _ := ev["type"].(string)

	if resp, ok := ev["response"].(map[string]any); ok {
		if t.id == "" {
			if id, ok := resp["id"].(string); ok {
				t.id = id
			}
		}
		if t.model == "" {
			if m, ok := resp["model"].(string); ok {
				t.model = m
			}
		}
		if t.created == 0 {
			if v, ok := resp["created_at"].(float64); ok {
				t.created = int64(v)
			}
		}
	}

	switch eventType {
	case "response.created":
		if !t.sentRole && t.mode == CompatStreamModeChatCompletions {
			t.sentRole = true
			return []string{t.buildChatRoleChunk()}, false
		}
		return nil, false
	case "response.output_text.delta":
		delta, _ := ev["delta"].(string)
		if delta == "" {
			return nil, false
		}
		out := make([]string, 0, 2)
		if !t.sentRole && t.mode == CompatStreamModeChatCompletions {
			t.sentRole = true
			out = append(out, t.buildChatRoleChunk())
		}
		out = append(out, t.buildDeltaChunk(delta))
		return out, false
	case "response.completed", "response.done":
		out := make([]string, 0, 3)
		if !t.sentRole && t.mode == CompatStreamModeChatCompletions {
			t.sentRole = true
			out = append(out, t.buildChatRoleChunk())
		}
		out = append(out, t.buildFinalChunk("stop"))
		out = append(out, "[DONE]")
		t.done = true
		return out, true
	default:
		return nil, false
	}
}

func (t *ResponseStreamCompatTransformer) ensureDefaults() {
	if t.id == "" {
		t.id = "chatcmpl-unknown"
	}
	if t.model == "" {
		t.model = "unknown"
	}
	if t.created == 0 {
		t.created = time.Now().Unix()
	}
}

func (t *ResponseStreamCompatTransformer) buildChatRoleChunk() string {
	t.ensureDefaults()
	chunk := map[string]any{
		"id":      t.id,
		"object":  "chat.completion.chunk",
		"created": t.created,
		"model":   t.model,
		"choices": []any{
			map[string]any{
				"index": 0,
				"delta": map[string]any{
					"role": "assistant",
				},
				"finish_reason": nil,
			},
		},
	}
	b, _ := json.Marshal(chunk)
	return string(b)
}

func (t *ResponseStreamCompatTransformer) buildDeltaChunk(delta string) string {
	t.ensureDefaults()
	switch t.mode {
	case CompatStreamModeCompletions:
		chunk := map[string]any{
			"id":      t.id,
			"object":  "text_completion",
			"created": t.created,
			"model":   t.model,
			"choices": []any{
				map[string]any{
					"text":          delta,
					"index":         0,
					"finish_reason": nil,
					"logprobs":      nil,
				},
			},
		}
		b, _ := json.Marshal(chunk)
		return string(b)
	default:
		chunk := map[string]any{
			"id":      t.id,
			"object":  "chat.completion.chunk",
			"created": t.created,
			"model":   t.model,
			"choices": []any{
				map[string]any{
					"index": 0,
					"delta": map[string]any{
						"content": delta,
					},
					"finish_reason": nil,
				},
			},
		}
		b, _ := json.Marshal(chunk)
		return string(b)
	}
}

func (t *ResponseStreamCompatTransformer) buildFinalChunk(finishReason string) string {
	t.ensureDefaults()
	switch t.mode {
	case CompatStreamModeCompletions:
		chunk := map[string]any{
			"id":      t.id,
			"object":  "text_completion",
			"created": t.created,
			"model":   t.model,
			"choices": []any{
				map[string]any{
					"text":          "",
					"index":         0,
					"finish_reason": finishReason,
					"logprobs":      nil,
				},
			},
		}
		b, _ := json.Marshal(chunk)
		return string(b)
	default:
		chunk := map[string]any{
			"id":      t.id,
			"object":  "chat.completion.chunk",
			"created": t.created,
			"model":   t.model,
			"choices": []any{
				map[string]any{
					"index":         0,
					"delta":         map[string]any{},
					"finish_reason": finishReason,
				},
			},
		}
		b, _ := json.Marshal(chunk)
		return string(b)
	}
}
