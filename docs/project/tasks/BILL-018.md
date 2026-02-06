## BILL-018 — Billing: default pricing missing policy must not undercharge unknown non-Claude models

### Problem
When `pricing.missing_policy` is empty, `BillingService.GetModelPricing` currently defaults to `fallback_any`. This silently applies Claude fallback pricing to **any** unknown model (including non-Claude providers), which can significantly undercharge and create revenue leakage.

### Evidence (code)
- Default fallback policy when unset: `backend/internal/service/billing_service.go:190` (policy defaults to `fallback_any`)
- Fallback logic uses Claude-family heuristics and a default Sonnet price: `backend/internal/service/billing_service.go:140`

### Goal
Change the default missing-policy behavior to a safer option:
- Default to `fallback_claude_only` (Claude family falls back; unknown non-Claude errors).
- Also set config default `pricing.missing_policy` accordingly to make behavior explicit.

### Acceptance Criteria
- [ ] With empty `pricing.missing_policy`, `GetModelPricing("gpt-unknown")` errors, `GetModelPricing("claude-3-opus")` still falls back.
- [ ] Existing explicit policy behaviors remain unchanged.
- [ ] Verification: `cd backend; go test ./...` PASS.

