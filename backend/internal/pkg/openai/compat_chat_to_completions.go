package openai

import (
	"encoding/json"
	"strings"
	"time"
)

// ChatCompletionsBodyToCompletionsResponse converts an OpenAI Chat Completions JSON response
// into a legacy Completions JSON response (best-effort).
func ChatCompletionsBodyToCompletionsResponse(chatBody []byte) ([]byte, error) {
	var chat map[string]any
	if err := json.Unmarshal(chatBody, &chat); err != nil {
		return nil, err
	}

	// Preserve structured error payloads.
	if _, ok := chat["error"]; ok {
		return chatBody, nil
	}

	out := map[string]any{}
	if id, ok := chat["id"].(string); ok && strings.TrimSpace(id) != "" {
		out["id"] = id
	}
	out["object"] = "text_completion"

	created := int64(0)
	if v, ok := chat["created"].(float64); ok {
		created = int64(v)
	}
	if created == 0 {
		created = time.Now().Unix()
	}
	out["created"] = created

	if model, ok := chat["model"].(string); ok && strings.TrimSpace(model) != "" {
		out["model"] = model
	}

	choicesOut := make([]any, 0)
	if choices, ok := chat["choices"].([]any); ok {
		for _, item := range choices {
			im, ok := item.(map[string]any)
			if !ok || im == nil {
				continue
			}

			index := 0
			if v, ok := im["index"].(float64); ok {
				index = int(v)
			}

			finishReason, _ := im["finish_reason"].(string)
			if strings.TrimSpace(finishReason) == "" {
				finishReason = ""
			}

			text := ""
			if msg, ok := im["message"].(map[string]any); ok && msg != nil {
				text = extractChatTextContent(msg["content"])
			}

			choice := map[string]any{
				"text":          text,
				"index":         index,
				"logprobs":      nil,
				"finish_reason": nil,
			}
			if strings.TrimSpace(finishReason) != "" {
				choice["finish_reason"] = finishReason
			}
			choicesOut = append(choicesOut, choice)
		}
	}
	out["choices"] = choicesOut

	// Pass through usage if present and shaped like OpenAI usage.
	if usage, ok := chat["usage"].(map[string]any); ok && usage != nil {
		out["usage"] = usage
	}

	return json.Marshal(out)
}

// ChatCompletionsToCompletionsStreamTransformer converts OpenAI Chat Completions SSE payloads
// (data JSON) into legacy Completions SSE payloads (data JSON). Best-effort.
type ChatCompletionsToCompletionsStreamTransformer struct {
	id      string
	model   string
	created int64
	done    bool
}

func NewChatCompletionsToCompletionsStreamTransformer() *ChatCompletionsToCompletionsStreamTransformer {
	return &ChatCompletionsToCompletionsStreamTransformer{}
}

func (t *ChatCompletionsToCompletionsStreamTransformer) HandleData(data string) (payloads []string, done bool) {
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
		return nil, false
	}

	// Preserve error payloads.
	if _, ok := ev["error"]; ok {
		return []string{data}, false
	}

	if t.id == "" {
		if id, ok := ev["id"].(string); ok && strings.TrimSpace(id) != "" {
			t.id = id
		}
	}
	if t.model == "" {
		if m, ok := ev["model"].(string); ok && strings.TrimSpace(m) != "" {
			t.model = m
		}
	}
	if t.created == 0 {
		if v, ok := ev["created"].(float64); ok {
			t.created = int64(v)
		}
	}
	t.ensureDefaults()

	choices, ok := ev["choices"].([]any)
	if !ok || len(choices) == 0 {
		return nil, false
	}

	outChoices := make([]any, 0, len(choices))
	for _, item := range choices {
		im, ok := item.(map[string]any)
		if !ok || im == nil {
			continue
		}

		index := 0
		if v, ok := im["index"].(float64); ok {
			index = int(v)
		}

		finishReason, _ := im["finish_reason"].(string)

		deltaText := ""
		if delta, ok := im["delta"].(map[string]any); ok && delta != nil {
			if c, ok := delta["content"].(string); ok {
				deltaText = c
			}
		}

		choice := map[string]any{
			"text":          deltaText,
			"index":         index,
			"logprobs":      nil,
			"finish_reason": nil,
		}
		if strings.TrimSpace(finishReason) != "" {
			choice["finish_reason"] = finishReason
		}
		outChoices = append(outChoices, choice)
	}

	if len(outChoices) == 0 {
		return nil, false
	}

	chunk := map[string]any{
		"id":      t.id,
		"object":  "text_completion",
		"created": t.created,
		"model":   t.model,
		"choices": outChoices,
	}

	// Pass through usage if present (some providers emit usage on the final chunk).
	if usage, ok := ev["usage"].(map[string]any); ok && usage != nil {
		chunk["usage"] = usage
	}

	b, err := json.Marshal(chunk)
	if err != nil {
		return nil, false
	}
	return []string{string(b)}, false
}

func (t *ChatCompletionsToCompletionsStreamTransformer) ensureDefaults() {
	if t.id == "" {
		t.id = "cmpl-unknown"
	}
	if t.model == "" {
		t.model = "unknown"
	}
	if t.created == 0 {
		t.created = time.Now().Unix()
	}
}
