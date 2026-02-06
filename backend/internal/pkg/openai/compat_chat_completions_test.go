package openai

import (
	"encoding/json"
	"testing"
)

func TestChatCompletionsRequestToResponsesPayload_Basic(t *testing.T) {
	req := map[string]any{
		"model":  "gpt-4o-mini",
		"stream": true,
		"messages": []any{
			map[string]any{"role": "system", "content": "You are helpful."},
			map[string]any{"role": "user", "content": "hi"},
		},
		"temperature": 0.5,
		"max_tokens":  12,
	}

	payload, model, stream, err := ChatCompletionsRequestToResponsesPayload(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if model != "gpt-4o-mini" {
		t.Fatalf("model mismatch: %q", model)
	}
	if !stream {
		t.Fatalf("expected stream=true")
	}
	if payload["model"] != "gpt-4o-mini" {
		t.Fatalf("payload model mismatch: %v", payload["model"])
	}
	if payload["stream"] != true {
		t.Fatalf("payload stream mismatch: %v", payload["stream"])
	}
	if payload["instructions"] != "You are helpful." {
		t.Fatalf("instructions mismatch: %v", payload["instructions"])
	}

	input, ok := payload["input"].([]any)
	if !ok || len(input) != 1 {
		t.Fatalf("expected 1 input message, got: %#v", payload["input"])
	}
	msg, ok := input[0].(map[string]any)
	if !ok {
		t.Fatalf("input[0] not object")
	}
	if msg["role"] != "user" {
		t.Fatalf("role mismatch: %v", msg["role"])
	}
	content, ok := msg["content"].([]any)
	if !ok || len(content) != 1 {
		t.Fatalf("content mismatch: %#v", msg["content"])
	}
	part, ok := content[0].(map[string]any)
	if !ok {
		t.Fatalf("content[0] not object")
	}
	if part["type"] != "input_text" || part["text"] != "hi" {
		t.Fatalf("content part mismatch: %#v", part)
	}
}

func TestChatCompletionsRequestToResponsesPayload_ToolsFlatten(t *testing.T) {
	req := map[string]any{
		"model": "gpt-4o-mini",
		"messages": []any{
			map[string]any{"role": "user", "content": "hi"},
		},
		"tools": []any{
			map[string]any{
				"type": "function",
				"function": map[string]any{
					"name":        "my_tool",
					"description": "d",
					"parameters":  map[string]any{"type": "object"},
				},
			},
		},
		"tool_choice": map[string]any{
			"type": "function",
			"function": map[string]any{
				"name": "my_tool",
			},
		},
	}

	payload, _, _, err := ChatCompletionsRequestToResponsesPayload(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	tools, ok := payload["tools"].([]any)
	if !ok || len(tools) != 1 {
		t.Fatalf("tools mismatch: %#v", payload["tools"])
	}
	tool, ok := tools[0].(map[string]any)
	if !ok {
		t.Fatalf("tools[0] not object")
	}
	if tool["type"] != "function" || tool["name"] != "my_tool" {
		t.Fatalf("tool flatten mismatch: %#v", tool)
	}

	choice, ok := payload["tool_choice"].(map[string]any)
	if !ok {
		t.Fatalf("tool_choice not object: %#v", payload["tool_choice"])
	}
	if choice["type"] != "function" || choice["name"] != "my_tool" {
		t.Fatalf("tool_choice mismatch: %#v", choice)
	}
}

func TestChatCompletionsRequestToResponsesPayload_ToolContinuationItems(t *testing.T) {
	req := map[string]any{
		"model": "gpt-4o-mini",
		"messages": []any{
			map[string]any{"role": "user", "content": "hi"},
			map[string]any{
				"role":    "assistant",
				"content": "",
				"tool_calls": []any{
					map[string]any{
						"id":   "call_1",
						"type": "function",
						"function": map[string]any{
							"name":      "my_tool",
							"arguments": "{\"a\":1}",
						},
					},
				},
			},
			map[string]any{
				"role":         "tool",
				"tool_call_id": "call_1",
				"content":      "ok",
			},
		},
	}

	payload, _, _, err := ChatCompletionsRequestToResponsesPayload(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	input, ok := payload["input"].([]any)
	if !ok {
		t.Fatalf("input not array: %#v", payload["input"])
	}
	if len(input) != 4 {
		t.Fatalf("expected 4 input items (user, assistant, function_call, function_call_output), got %d", len(input))
	}

	fnCall, ok := input[2].(map[string]any)
	if !ok {
		t.Fatalf("input[2] not object")
	}
	if fnCall["type"] != "function_call" || fnCall["call_id"] != "call_1" || fnCall["name"] != "my_tool" {
		t.Fatalf("function_call mismatch: %#v", fnCall)
	}

	fnOut, ok := input[3].(map[string]any)
	if !ok {
		t.Fatalf("input[3] not object")
	}
	if fnOut["type"] != "function_call_output" || fnOut["call_id"] != "call_1" || fnOut["output"] != "ok" {
		t.Fatalf("function_call_output mismatch: %#v", fnOut)
	}
}

func TestCompletionsRequestToResponsesPayload_Basic(t *testing.T) {
	req := map[string]any{
		"model":  "gpt-4o-mini",
		"prompt": "hello",
		"stream": false,
	}

	payload, model, stream, err := CompletionsRequestToResponsesPayload(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if model != "gpt-4o-mini" {
		t.Fatalf("model mismatch: %q", model)
	}
	if stream {
		t.Fatalf("expected stream=false")
	}
	input, ok := payload["input"].([]any)
	if !ok || len(input) != 1 {
		t.Fatalf("expected 1 input message, got: %#v", payload["input"])
	}
}

func TestResponsesBodyToChatCompletionsResponse_Basic(t *testing.T) {
	resp := map[string]any{
		"id":         "resp_123",
		"created_at": float64(123),
		"model":      "gpt-4o-mini",
		"output": []any{
			map[string]any{
				"type": "message",
				"role": "assistant",
				"content": []any{
					map[string]any{"type": "output_text", "text": "Hello"},
				},
			},
		},
		"usage": map[string]any{
			"input_tokens":  float64(3),
			"output_tokens": float64(2),
		},
	}
	raw, _ := json.Marshal(resp)

	converted, err := ResponsesBodyToChatCompletionsResponse(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	var out map[string]any
	if err := json.Unmarshal(converted, &out); err != nil {
		t.Fatalf("failed to parse converted: %v", err)
	}
	if out["object"] != "chat.completion" {
		t.Fatalf("object mismatch: %v", out["object"])
	}
	choices, ok := out["choices"].([]any)
	if !ok || len(choices) != 1 {
		t.Fatalf("choices mismatch: %#v", out["choices"])
	}
	choice, _ := choices[0].(map[string]any)
	msg, _ := choice["message"].(map[string]any)
	if msg["content"] != "Hello" {
		t.Fatalf("content mismatch: %#v", msg)
	}
	usage, _ := out["usage"].(map[string]any)
	if usage["total_tokens"] != float64(5) && usage["total_tokens"] != 5 {
		// json numbers decode as float64
		t.Fatalf("usage mismatch: %#v", usage)
	}
}

func TestResponsesBodyToCompletionsResponse_Basic(t *testing.T) {
	resp := map[string]any{
		"id":         "resp_123",
		"created_at": float64(123),
		"model":      "gpt-4o-mini",
		"output": []any{
			map[string]any{
				"type": "message",
				"role": "assistant",
				"content": []any{
					map[string]any{"type": "output_text", "text": "Hello"},
				},
			},
		},
	}
	raw, _ := json.Marshal(resp)

	converted, err := ResponsesBodyToCompletionsResponse(raw)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	var out map[string]any
	if err := json.Unmarshal(converted, &out); err != nil {
		t.Fatalf("failed to parse converted: %v", err)
	}
	if out["object"] != "text_completion" {
		t.Fatalf("object mismatch: %v", out["object"])
	}
}

func TestResponseStreamCompatTransformer_Chat(t *testing.T) {
	tr := NewResponseStreamCompatTransformer(CompatStreamModeChatCompletions)

	p, done := tr.HandleData(`{"type":"response.created","response":{"id":"resp_1","model":"gpt-4o","created_at":1}}`)
	if done {
		t.Fatalf("unexpected done")
	}
	if len(p) != 1 {
		t.Fatalf("expected 1 payload, got %d", len(p))
	}

	p, done = tr.HandleData(`{"type":"response.output_text.delta","delta":"Hi","response":{"id":"resp_1","model":"gpt-4o","created_at":1}}`)
	if done {
		t.Fatalf("unexpected done")
	}
	if len(p) != 1 {
		// role already sent at response.created
		t.Fatalf("expected 1 payload, got %d", len(p))
	}

	p, done = tr.HandleData(`{"type":"response.completed","response":{"id":"resp_1","model":"gpt-4o","created_at":1}}`)
	if !done {
		t.Fatalf("expected done")
	}
	if len(p) < 2 || p[len(p)-1] != "[DONE]" {
		t.Fatalf("expected [DONE] at end, got %#v", p)
	}
}

func TestResponseStreamCompatTransformer_Completions(t *testing.T) {
	tr := NewResponseStreamCompatTransformer(CompatStreamModeCompletions)

	p, _ := tr.HandleData(`{"type":"response.created","response":{"id":"resp_1","model":"gpt-4o","created_at":1}}`)
	if len(p) != 0 {
		t.Fatalf("completions should not emit role chunk on response.created")
	}

	p, _ = tr.HandleData(`{"type":"response.output_text.delta","delta":"Hi","response":{"id":"resp_1","model":"gpt-4o","created_at":1}}`)
	if len(p) != 1 {
		t.Fatalf("expected 1 payload, got %d", len(p))
	}
	if !json.Valid([]byte(p[0])) {
		t.Fatalf("expected valid JSON chunk, got: %q", p[0])
	}
}
