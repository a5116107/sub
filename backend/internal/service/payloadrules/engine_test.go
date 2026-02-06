package payloadrules

import (
	"encoding/json"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/config"
)

func TestEngineApply_Default_FirstWriteWins(t *testing.T) {
	engine, _ := NewEngine(config.GatewayPayloadRulesConfig{
		Default: []config.GatewayPayloadRule{
			{
				Models: []config.GatewayPayloadRuleModel{{Name: "gpt-*", Protocol: ProtocolOpenAIResponses}},
				Params: map[string]any{
					"stream_options.include_usage": true,
				},
			},
			{
				Models: []config.GatewayPayloadRuleModel{{Name: "gpt-*", Protocol: ProtocolOpenAIResponses}},
				Params: map[string]any{
					"stream_options.include_usage": false,
				},
			},
		},
	})

	input := []byte(`{"model":"gpt-4o","stream":true}`)
	out, _ := engine.Apply(ApplyInput{
		Protocol: ProtocolOpenAIResponses,
		Path:     "/openai/v1/responses",
		Model:    "gpt-4o",
		Payload:  input,
	})

	var parsed map[string]any
	if err := json.Unmarshal(out, &parsed); err != nil {
		t.Fatalf("unmarshal output: %v", err)
	}
	streamOptions, _ := parsed["stream_options"].(map[string]any)
	if streamOptions == nil {
		t.Fatalf("expected stream_options to be set")
	}
	if got, ok := streamOptions["include_usage"].(bool); !ok || got != true {
		t.Fatalf("expected include_usage=true, got=%v (ok=%v)", streamOptions["include_usage"], ok)
	}
}

func TestEngineApply_Override_LastWriteWins(t *testing.T) {
	engine, _ := NewEngine(config.GatewayPayloadRulesConfig{
		Override: []config.GatewayPayloadRule{
			{
				Models: []config.GatewayPayloadRuleModel{{Name: "claude-*", Protocol: ProtocolAnthropicMessages}},
				Params: map[string]any{
					"temperature": 0.1,
				},
			},
			{
				Models: []config.GatewayPayloadRuleModel{{Name: "claude-*", Protocol: ProtocolAnthropicMessages}},
				Params: map[string]any{
					"temperature": 0.9,
				},
			},
		},
	})

	input := []byte(`{"model":"claude-3-5-sonnet-20241022","temperature":0.5}`)
	out, _ := engine.Apply(ApplyInput{
		Protocol: ProtocolAnthropicMessages,
		Path:     "/v1/messages",
		Model:    "claude-3-5-sonnet-20241022",
		Payload:  input,
	})

	var parsed map[string]any
	if err := json.Unmarshal(out, &parsed); err != nil {
		t.Fatalf("unmarshal output: %v", err)
	}
	if got, ok := parsed["temperature"].(float64); !ok || got != 0.9 {
		t.Fatalf("expected temperature=0.9, got=%v (ok=%v)", parsed["temperature"], ok)
	}
}

func TestEngineApply_Default_DoesNotOverwriteExisting(t *testing.T) {
	engine, _ := NewEngine(config.GatewayPayloadRulesConfig{
		Default: []config.GatewayPayloadRule{
			{
				Models: []config.GatewayPayloadRuleModel{{Name: "gpt-*", Protocol: ProtocolOpenAIChatCompletions}},
				Params: map[string]any{
					"temperature": 1.0,
				},
			},
		},
	})

	input := []byte(`{"model":"gpt-4o","temperature":0.2}`)
	out, _ := engine.Apply(ApplyInput{
		Protocol: ProtocolOpenAIChatCompletions,
		Path:     "/v1/chat/completions",
		Model:    "gpt-4o",
		Payload:  input,
	})

	var parsed map[string]any
	if err := json.Unmarshal(out, &parsed); err != nil {
		t.Fatalf("unmarshal output: %v", err)
	}
	if got, ok := parsed["temperature"].(float64); !ok || got != 0.2 {
		t.Fatalf("expected temperature preserved=0.2, got=%v (ok=%v)", parsed["temperature"], ok)
	}
}

func TestEngineApply_DefaultRaw_SetsRawJSON(t *testing.T) {
	engine, _ := NewEngine(config.GatewayPayloadRulesConfig{
		DefaultRaw: []config.GatewayPayloadRule{
			{
				Models: []config.GatewayPayloadRuleModel{{Name: "gpt-*", Protocol: ProtocolOpenAIResponses}},
				Params: map[string]any{
					"response_format": `{"type":"json_schema"}`,
				},
			},
		},
	})

	input := []byte(`{"model":"gpt-4o"}`)
	out, _ := engine.Apply(ApplyInput{
		Protocol: ProtocolOpenAIResponses,
		Path:     "/openai/v1/responses",
		Model:    "gpt-4o",
		Payload:  input,
	})

	var parsed map[string]any
	if err := json.Unmarshal(out, &parsed); err != nil {
		t.Fatalf("unmarshal output: %v", err)
	}
	obj, ok := parsed["response_format"].(map[string]any)
	if !ok || obj == nil {
		t.Fatalf("expected response_format object, got=%T", parsed["response_format"])
	}
	if got, _ := obj["type"].(string); got != "json_schema" {
		t.Fatalf("expected response_format.type=json_schema, got=%q", got)
	}
}

func TestEngineApply_PathPrefixMatching(t *testing.T) {
	engine, _ := NewEngine(config.GatewayPayloadRulesConfig{
		Override: []config.GatewayPayloadRule{
			{
				Models: []config.GatewayPayloadRuleModel{{Name: "gpt-*", Protocol: ProtocolOpenAIChatCompletions}},
				Paths:  []string{"/v1/chat/completions"},
				Params: map[string]any{"temperature": 0.3},
			},
		},
	})

	input := []byte(`{"model":"gpt-4o"}`)
	out1, _ := engine.Apply(ApplyInput{
		Protocol: ProtocolOpenAIChatCompletions,
		Path:     "/v1/chat/completions",
		Model:    "gpt-4o",
		Payload:  input,
	})
	out2, _ := engine.Apply(ApplyInput{
		Protocol: ProtocolOpenAIChatCompletions,
		Path:     "/v1/responses",
		Model:    "gpt-4o",
		Payload:  input,
	})

	var p1 map[string]any
	_ = json.Unmarshal(out1, &p1)
	if _, ok := p1["temperature"]; !ok {
		t.Fatalf("expected temperature set for matching path")
	}

	var p2 map[string]any
	_ = json.Unmarshal(out2, &p2)
	if _, ok := p2["temperature"]; ok {
		t.Fatalf("did not expect temperature set for non-matching path")
	}
}

func TestEngineApply_DeterministicParamOrder(t *testing.T) {
	engine, _ := NewEngine(config.GatewayPayloadRulesConfig{
		Override: []config.GatewayPayloadRule{
			{
				Models: []config.GatewayPayloadRuleModel{{Name: "*", Protocol: ProtocolOpenAIResponses}},
				Params: map[string]any{
					"foo.b": 2,
					"foo":   map[string]any{"a": 1},
				},
			},
		},
	})

	input := []byte(`{"model":"gpt-4o"}`)
	out, _ := engine.Apply(ApplyInput{
		Protocol: ProtocolOpenAIResponses,
		Path:     "/openai/v1/responses",
		Model:    "gpt-4o",
		Payload:  input,
	})

	var parsed map[string]any
	if err := json.Unmarshal(out, &parsed); err != nil {
		t.Fatalf("unmarshal output: %v", err)
	}
	foo, _ := parsed["foo"].(map[string]any)
	if foo == nil {
		t.Fatalf("expected foo object")
	}
	if got, ok := foo["a"].(float64); !ok || got != 1 {
		t.Fatalf("expected foo.a=1, got=%v (ok=%v)", foo["a"], ok)
	}
	if got, ok := foo["b"].(float64); !ok || got != 2 {
		t.Fatalf("expected foo.b=2, got=%v (ok=%v)", foo["b"], ok)
	}
}

func TestNewEngine_SkipsInvalidRules(t *testing.T) {
	engine, res := NewEngine(config.GatewayPayloadRulesConfig{
		Override: []config.GatewayPayloadRule{
			{Models: nil, Params: map[string]any{"x": 1}},                                                               // invalid
			{Models: []config.GatewayPayloadRuleModel{{Name: "gpt-*", Protocol: ProtocolOpenAIResponses}}, Params: nil}, // invalid
		},
	})
	if len(res.Warnings) == 0 {
		t.Fatalf("expected warnings for invalid rules")
	}

	input := []byte(`{"model":"gpt-4o"}`)
	out, stats := engine.Apply(ApplyInput{
		Protocol: ProtocolOpenAIResponses,
		Path:     "/openai/v1/responses",
		Model:    "gpt-4o",
		Payload:  input,
	})
	if stats.Changed {
		t.Fatalf("did not expect payload to change with only invalid rules")
	}
	if string(out) != string(input) {
		t.Fatalf("expected output to equal input")
	}
}
