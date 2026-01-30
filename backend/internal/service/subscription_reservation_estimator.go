package service

import (
	"fmt"
	"strings"

	"github.com/tidwall/gjson"
)

type SubscriptionReserveProtocol string

const (
	SubscriptionReserveAnthropic SubscriptionReserveProtocol = "anthropic"
	SubscriptionReserveOpenAI    SubscriptionReserveProtocol = "openai"
	SubscriptionReserveGemini    SubscriptionReserveProtocol = "gemini"
)

func estimateTokensForReservation(protocol SubscriptionReserveProtocol, body []byte) (inputTokens, outputTokens int) {
	// Heuristic input estimate: JSON bytes ~ 4 chars/token.
	inputTokens = len(body) / 4

	// For UTF-8 multi-byte content (e.g. CJK), bytes/4 can under-estimate.
	// Use a more conservative heuristic to reduce single-request quota "punch-through".
	hasNonASCII := false
	for _, b := range body {
		if b >= 0x80 {
			hasNonASCII = true
			break
		}
	}
	if hasNonASCII {
		if alt := len(body) / 2; alt > inputTokens {
			inputTokens = alt
		}
	}
	if inputTokens > 200_000 {
		inputTokens = 200_000
	}

	getInt := func(path string) int {
		v := gjson.GetBytes(body, path)
		if !v.Exists() {
			return 0
		}
		n := int(v.Int())
		if n < 0 {
			return 0
		}
		return n
	}

	switch protocol {
	case SubscriptionReserveAnthropic:
		outputTokens = getInt("max_tokens")
	case SubscriptionReserveOpenAI:
		outputTokens = getInt("max_output_tokens")
		if outputTokens == 0 {
			outputTokens = getInt("max_completion_tokens")
		}
		if outputTokens == 0 {
			outputTokens = getInt("max_tokens")
		}
	case SubscriptionReserveGemini:
		// Gemini: generationConfig.maxOutputTokens (camelCase).
		outputTokens = getInt("generationConfig.maxOutputTokens")
		if outputTokens == 0 {
			// Some clients may send snake_case.
			outputTokens = getInt("generationConfig.max_output_tokens")
		}
	default:
		outputTokens = 0
	}

	// Conservative fallback to avoid "unknown max" blowing through quotas.
	if outputTokens <= 0 {
		outputTokens = 8192
	}
	if outputTokens > 200_000 {
		outputTokens = 200_000
	}
	return inputTokens, outputTokens
}

func estimateSubscriptionReservationUSD(billingService *BillingService, model string, body []byte, protocol SubscriptionReserveProtocol) (float64, error) {
	if billingService == nil {
		return 0, fmt.Errorf("billing service not initialized")
	}
	model = strings.TrimSpace(model)
	if model == "" {
		return 0, fmt.Errorf("missing model")
	}
	inTokens, outTokens := estimateTokensForReservation(protocol, body)
	breakdown, err := billingService.CalculateCost(model, UsageTokens{
		InputTokens:  inTokens,
		OutputTokens: outTokens,
	}, 1.0)
	if err != nil {
		return 0, err
	}
	return breakdown.TotalCost, nil
}

// EstimateSubscriptionReservationUSD returns a best-effort upper bound for subscription quota reservation.
func (s *GatewayService) EstimateSubscriptionReservationUSD(model string, body []byte, protocol SubscriptionReserveProtocol) (float64, error) {
	return estimateSubscriptionReservationUSD(s.billingService, model, body, protocol)
}

// EstimateSubscriptionReservationUSD returns a best-effort upper bound for subscription quota reservation.
func (s *OpenAIGatewayService) EstimateSubscriptionReservationUSD(model string, body []byte, protocol SubscriptionReserveProtocol) (float64, error) {
	return estimateSubscriptionReservationUSD(s.billingService, model, body, protocol)
}
