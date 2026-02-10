# UPSYNC-008: Scheduler/failover fairness and retry-budget parity

> Status: Active
> Priority: P1
> Depends on: `UPSYNC-002`, `UPSYNC-003`
> Source: `docs/project/UPSTREAM_GAP_SSOT_2026-02-10.md`

## Goal

Align scheduler and failover behavior for fairness and retry predictability.

## Scope

- Re-check equal-rank shuffle behavior and load-aware account selection parity.
- Align retry budget behavior after account switches.
- Validate cooldown behavior using upstream retry delay signals.

## Non-Goals

- No breaking change to current account selection APIs.

## Acceptance

1. Same-rank candidate selection avoids deterministic hot-spot bias.
2. Switch-aware retry budgets are consistent across major gateway paths.
3. Cooldown semantics are based on upstream-provided retry hints where available.

## Verify

- `go test ./internal/service/... -run "Scheduler|Shuffle|Retry|Cooldown|Sticky" -count=1`
- `go test ./internal/service/...`
- `go test ./...`
