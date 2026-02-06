package openai

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

// ChatCompletionsRequestToResponsesPayload converts a POST /v1/chat/completions request
// into an OpenAI Responses API compatible payload for this gateway.
//
// It intentionally implements a minimal, strict subset and will drop/ignore fields
// that are not part of the supported compatibility surface.
func ChatCompletionsRequestToResponsesPayload(req map[string]any) (payload map[string]any, model string, stream bool, err error) {
	model, _ = req["model"].(string)
	model = strings.TrimSpace(model)
	if model == "" {
		return nil, "", false, errors.New("model is required")
	}
	stream, _ = req["stream"].(bool)

	rawMessages, ok := req["messages"]
	if !ok {
		return nil, model, stream, errors.New("messages is required")
	}
	msgSlice, ok := rawMessages.([]any)
	if !ok {
		return nil, model, stream, errors.New("messages must be an array")
	}

	var instructionsParts []string
	input := make([]any, 0, len(msgSlice))

	for _, m := range msgSlice {
		msg, ok := m.(map[string]any)
		if !ok {
			// Be strict: malformed message should fail fast.
			return nil, model, stream, errors.New("messages items must be objects")
		}
		role, _ := msg["role"].(string)
		role = strings.TrimSpace(role)
		if role == "" {
			return nil, model, stream, errors.New("messages.role is required")
		}

		content := msg["content"]
		if role == "system" {
			if text := extractChatTextContent(content); strings.TrimSpace(text) != "" {
				instructionsParts = append(instructionsParts, text)
			}
			continue
		}

		// Tool output message -> Responses function_call_output item.
		if role == "tool" {
			toolCallID, _ := msg["tool_call_id"].(string)
			toolCallID = strings.TrimSpace(toolCallID)
			if toolCallID == "" {
				return nil, model, stream, errors.New("messages.tool_call_id is required for role=tool")
			}
			outputText := extractChatTextContent(content)
			input = append(input, map[string]any{
				"type":    "function_call_output",
				"call_id": toolCallID,
				"output":  outputText,
			})
			continue
		}

		parts, convErr := chatContentToInputParts(content)
		if convErr != nil {
			return nil, model, stream, convErr
		}
		inputMsg := map[string]any{
			"role":    role,
			"content": parts,
		}
		input = append(input, inputMsg)

		// Assistant tool calls -> Responses function_call items (for continuation context).
		if role == "assistant" {
			if rawToolCalls, ok := msg["tool_calls"]; ok {
				if toolCalls, ok := rawToolCalls.([]any); ok {
					for _, tc := range toolCalls {
						tcMap, ok := tc.(map[string]any)
						if !ok {
							continue
						}
						callID, _ := tcMap["id"].(string)
						callID = strings.TrimSpace(callID)
						fn, ok := tcMap["function"].(map[string]any)
						if !ok {
							continue
						}
						name, _ := fn["name"].(string)
						name = strings.TrimSpace(name)
						arguments, _ := fn["arguments"].(string)
						if callID == "" || name == "" {
							continue
						}
						input = append(input, map[string]any{
							"type":      "function_call",
							"call_id":   callID,
							"name":      name,
							"arguments": arguments,
						})
					}
				}
			}
		}
	}

	out := map[string]any{
		"model":  model,
		"stream": stream,
		"input":  input,
	}

	if len(instructionsParts) > 0 {
		out["instructions"] = strings.Join(instructionsParts, "\n\n")
	}

	// Common knobs (best-effort).
	copyIfPresent(out, req, "temperature")
	copyIfPresent(out, req, "top_p")
	copyIfPresent(out, req, "reasoning")
	copyIfPresent(out, req, "metadata")

	// max_tokens -> max_output_tokens (Responses API style)
	if v, ok := req["max_tokens"]; ok {
		out["max_output_tokens"] = v
	}

	// tools/tool_choice conversion: Chat Completions uses nested `function` object; Responses uses flattened fields.
	if tools, ok := req["tools"]; ok {
		mapped, mapErr := mapChatToolsToResponsesTools(tools)
		if mapErr != nil {
			return nil, model, stream, mapErr
		}
		if mapped != nil {
			out["tools"] = mapped
		}
	}
	if toolChoice, ok := req["tool_choice"]; ok {
		mapped, mapErr := mapChatToolChoiceToResponses(toolChoice)
		if mapErr != nil {
			return nil, model, stream, mapErr
		}
		if mapped != nil {
			out["tool_choice"] = mapped
		}
	}

	return out, model, stream, nil
}

// CompletionsRequestToResponsesPayload converts a POST /v1/completions request into
// an OpenAI Responses API compatible payload for this gateway.
func CompletionsRequestToResponsesPayload(req map[string]any) (payload map[string]any, model string, stream bool, err error) {
	model, _ = req["model"].(string)
	model = strings.TrimSpace(model)
	if model == "" {
		return nil, "", false, errors.New("model is required")
	}
	stream, _ = req["stream"].(bool)

	promptText, convErr := normalizePromptToString(req["prompt"])
	if convErr != nil {
		return nil, model, stream, convErr
	}
	if strings.TrimSpace(promptText) == "" {
		return nil, model, stream, errors.New("prompt is required")
	}

	out := map[string]any{
		"model":  model,
		"stream": stream,
		"input": []any{
			map[string]any{
				"role": "user",
				"content": []any{
					map[string]any{"type": "input_text", "text": promptText},
				},
			},
		},
	}

	copyIfPresent(out, req, "temperature")
	copyIfPresent(out, req, "top_p")
	copyIfPresent(out, req, "reasoning")
	copyIfPresent(out, req, "metadata")

	// max_tokens -> max_output_tokens (Responses API style)
	if v, ok := req["max_tokens"]; ok {
		out["max_output_tokens"] = v
	}

	return out, model, stream, nil
}

// CompletionsRequestToChatCompletionsPayload converts a POST /v1/completions request into
// an OpenAI Chat Completions compatible payload. This is used as a best-effort bridge for
// providers that only implement chat completions.
func CompletionsRequestToChatCompletionsPayload(req map[string]any) (payload map[string]any, model string, stream bool, err error) {
	model, _ = req["model"].(string)
	model = strings.TrimSpace(model)
	if model == "" {
		return nil, "", false, errors.New("model is required")
	}
	stream, _ = req["stream"].(bool)

	promptText, convErr := normalizePromptToString(req["prompt"])
	if convErr != nil {
		return nil, model, stream, convErr
	}
	if strings.TrimSpace(promptText) == "" {
		return nil, model, stream, errors.New("prompt is required")
	}

	out := map[string]any{
		"model":  model,
		"stream": stream,
		"messages": []any{
			map[string]any{
				"role":    "user",
				"content": promptText,
			},
		},
	}

	// Best-effort knob passthrough.
	copyIfPresent(out, req, "temperature")
	copyIfPresent(out, req, "top_p")
	copyIfPresent(out, req, "n")
	copyIfPresent(out, req, "stop")
	copyIfPresent(out, req, "presence_penalty")
	copyIfPresent(out, req, "frequency_penalty")
	copyIfPresent(out, req, "logit_bias")

	// Keep legacy max_tokens for chat completions.
	if v, ok := req["max_tokens"]; ok {
		out["max_tokens"] = v
	}

	return out, model, stream, nil
}

func copyIfPresent(dst, src map[string]any, key string) {
	if v, ok := src[key]; ok {
		dst[key] = v
	}
}

func extractChatTextContent(content any) string {
	switch v := content.(type) {
	case nil:
		return ""
	case string:
		return v
	case []any:
		// New chat content parts array
		var b strings.Builder
		for _, part := range v {
			pm, ok := part.(map[string]any)
			if !ok {
				continue
			}
			pt, _ := pm["type"].(string)
			if pt != "text" {
				continue
			}
			text, _ := pm["text"].(string)
			if text == "" {
				continue
			}
			_, _ = b.WriteString(text)
		}
		return b.String()
	default:
		return ""
	}
}

func chatContentToInputParts(content any) ([]any, error) {
	switch v := content.(type) {
	case nil:
		return []any{}, nil
	case string:
		if v == "" {
			return []any{}, nil
		}
		return []any{map[string]any{"type": "input_text", "text": v}}, nil
	case []any:
		parts := make([]any, 0, len(v))
		for _, p := range v {
			pm, ok := p.(map[string]any)
			if !ok {
				continue
			}
			pt, _ := pm["type"].(string)
			switch pt {
			case "text":
				text, _ := pm["text"].(string)
				if text == "" {
					continue
				}
				parts = append(parts, map[string]any{"type": "input_text", "text": text})
			default:
				// Ignore unsupported parts for now.
			}
		}
		return parts, nil
	default:
		return nil, fmt.Errorf("unsupported messages.content type: %T", content)
	}
}

func normalizePromptToString(prompt any) (string, error) {
	switch v := prompt.(type) {
	case nil:
		return "", nil
	case string:
		return v, nil
	case []any:
		parts := make([]string, 0, len(v))
		for _, p := range v {
			s, ok := p.(string)
			if !ok {
				return "", fmt.Errorf("prompt array must contain strings, got %T", p)
			}
			parts = append(parts, s)
		}
		return strings.Join(parts, "\n"), nil
	default:
		return "", fmt.Errorf("unsupported prompt type: %T", prompt)
	}
}

func mapChatToolsToResponsesTools(tools any) ([]any, error) {
	raw, ok := tools.([]any)
	if !ok {
		return nil, errors.New("tools must be an array")
	}
	out := make([]any, 0, len(raw))
	for _, t := range raw {
		tm, ok := t.(map[string]any)
		if !ok {
			return nil, errors.New("tools items must be objects")
		}
		toolType, _ := tm["type"].(string)
		if toolType != "function" {
			// best-effort: passthrough unknown tools
			out = append(out, tm)
			continue
		}
		// Chat Completions: {"type":"function","function":{...}}
		if fn, ok := tm["function"].(map[string]any); ok {
			name, _ := fn["name"].(string)
			if strings.TrimSpace(name) == "" {
				return nil, errors.New("tools.function.name is required")
			}
			mapped := map[string]any{
				"type": "function",
				"name": name,
			}
			if desc, ok := fn["description"]; ok {
				mapped["description"] = desc
			}
			if params, ok := fn["parameters"]; ok {
				mapped["parameters"] = params
			}
			out = append(out, mapped)
			continue
		}
		// Responses style already: {"type":"function","name":...}
		out = append(out, tm)
	}
	return out, nil
}

func mapChatToolChoiceToResponses(choice any) (any, error) {
	switch v := choice.(type) {
	case nil:
		return nil, nil
	case string:
		// "auto" | "none"
		return v, nil
	case map[string]any:
		toolType, _ := v["type"].(string)
		if toolType != "function" {
			return v, nil
		}
		// Chat Completions: {"type":"function","function":{"name":"..."}}
		if fn, ok := v["function"].(map[string]any); ok {
			name, _ := fn["name"].(string)
			name = strings.TrimSpace(name)
			if name == "" {
				return nil, errors.New("tool_choice.function.name is required")
			}
			return map[string]any{"type": "function", "name": name}, nil
		}
		return v, nil
	default:
		return nil, fmt.Errorf("unsupported tool_choice type: %T", choice)
	}
}

// ResponsesBodyToChatCompletionsResponse converts an OpenAI Responses response body
// into a Chat Completions compatible response body.
func ResponsesBodyToChatCompletionsResponse(body []byte) ([]byte, error) {
	var resp map[string]any
	if err := json.Unmarshal(body, &resp); err != nil {
		return body, nil
	}
	if _, ok := resp["error"]; ok {
		return body, nil
	}

	id, _ := resp["id"].(string)
	model, _ := resp["model"].(string)
	created := coerceCreatedUnix(resp)

	text := extractResponsesOutputText(resp)
	toolCalls := extractResponsesToolCalls(resp)

	message := map[string]any{
		"role":    "assistant",
		"content": text,
	}
	finishReason := "stop"
	if len(toolCalls) > 0 {
		message["tool_calls"] = toolCalls
		finishReason = "tool_calls"
		// When returning tool calls, content can be null in some clients; keep empty string for safety.
		if strings.TrimSpace(text) == "" {
			message["content"] = ""
		}
	}

	out := map[string]any{
		"id":      id,
		"object":  "chat.completion",
		"created": created,
		"model":   model,
		"choices": []any{
			map[string]any{
				"index":         0,
				"message":       message,
				"finish_reason": finishReason,
			},
		},
	}
	if usage := extractResponsesUsage(resp); usage != nil {
		out["usage"] = usage
	}
	return json.Marshal(out)
}

// ResponsesBodyToCompletionsResponse converts an OpenAI Responses response body
// into a legacy Completions compatible response body.
func ResponsesBodyToCompletionsResponse(body []byte) ([]byte, error) {
	var resp map[string]any
	if err := json.Unmarshal(body, &resp); err != nil {
		return body, nil
	}
	if _, ok := resp["error"]; ok {
		return body, nil
	}

	id, _ := resp["id"].(string)
	model, _ := resp["model"].(string)
	created := coerceCreatedUnix(resp)
	text := extractResponsesOutputText(resp)

	out := map[string]any{
		"id":      id,
		"object":  "text_completion",
		"created": created,
		"model":   model,
		"choices": []any{
			map[string]any{
				"text":          text,
				"index":         0,
				"finish_reason": "stop",
				"logprobs":      nil,
			},
		},
	}
	if usage := extractResponsesUsage(resp); usage != nil {
		out["usage"] = usage
	}
	return json.Marshal(out)
}

func coerceCreatedUnix(resp map[string]any) int64 {
	if v, ok := resp["created"].(float64); ok {
		return int64(v)
	}
	if v, ok := resp["created_at"].(float64); ok {
		return int64(v)
	}
	// Some upstreams may use ms timestamps.
	if v, ok := resp["created_at_ms"].(float64); ok {
		return int64(v / 1000)
	}
	return time.Now().Unix()
}

func extractResponsesOutputText(resp map[string]any) string {
	if v, ok := resp["output_text"].(string); ok && v != "" {
		return v
	}

	output, ok := resp["output"].([]any)
	if !ok {
		return ""
	}
	var b strings.Builder
	for _, item := range output {
		im, ok := item.(map[string]any)
		if !ok {
			continue
		}
		itemType, _ := im["type"].(string)
		switch itemType {
		case "message":
			role, _ := im["role"].(string)
			if role != "assistant" {
				continue
			}
			switch content := im["content"].(type) {
			case string:
				_, _ = b.WriteString(content)
			case []any:
				for _, part := range content {
					pm, ok := part.(map[string]any)
					if !ok {
						continue
					}
					pt, _ := pm["type"].(string)
					if pt != "output_text" && pt != "text" {
						continue
					}
					text, _ := pm["text"].(string)
					if text == "" {
						continue
					}
					_, _ = b.WriteString(text)
				}
			}
		case "output_text":
			if text, ok := im["text"].(string); ok && text != "" {
				_, _ = b.WriteString(text)
			}
		}
	}
	return b.String()
}

func extractResponsesToolCalls(resp map[string]any) []any {
	output, ok := resp["output"].([]any)
	if !ok {
		return nil
	}
	out := make([]any, 0)
	for _, item := range output {
		im, ok := item.(map[string]any)
		if !ok {
			continue
		}
		itemType, _ := im["type"].(string)
		switch itemType {
		case "function_call":
			callID, _ := im["call_id"].(string)
			name, _ := im["name"].(string)
			arguments, _ := im["arguments"].(string)
			if strings.TrimSpace(name) == "" {
				continue
			}
			tc := map[string]any{
				"id":   callID,
				"type": "function",
				"function": map[string]any{
					"name":      name,
					"arguments": arguments,
				},
			}
			out = append(out, tc)
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func extractResponsesUsage(resp map[string]any) map[string]any {
	usage, ok := resp["usage"].(map[string]any)
	if !ok {
		return nil
	}
	input, _ := usage["input_tokens"].(float64)
	output, _ := usage["output_tokens"].(float64)
	promptTokens := int(input)
	completionTokens := int(output)
	return map[string]any{
		"prompt_tokens":     promptTokens,
		"completion_tokens": completionTokens,
		"total_tokens":      promptTokens + completionTokens,
	}
}
