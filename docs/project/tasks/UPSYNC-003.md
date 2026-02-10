# UPSYNC-003: Unified error-policy parity for Gemini/Antigravity loops

> Status: Completed
> Priority: P0
> Depends on: `UPSYNC-001`
> Source: `docs/project/UPSTREAM_GAP_SSOT_2026-02-10.md`

## Goal

Close remaining edge cases in custom error-code policy handling and retry sequencing.

## Scope

- Ensure policy check precedes retry loops for all Gemini/Antigravity forward paths.
- Ensure skipped custom-error policy does not trigger unintended rate-limit updates.
- Ensure final outward status mapping is consistent with policy semantics.

## Non-Goals

- No broad refactor of `RateLimitService` beyond policy path.
- No unrelated OpenAI policy changes.

## Acceptance

1. `ErrorPolicySkipped` does not enter failover/rate-limit side effects.
2. Retry loops stop when policy says to stop.
3. Existing policy behavior already synced in previous batches remains green.

## Verify

- `go test ./internal/service/... -run "ErrorPolicy|Gemini|Antigravity|RateLimit" -count=1`
- `go test ./internal/service/...`
- `go test ./...`
