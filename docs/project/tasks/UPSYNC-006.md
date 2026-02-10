# UPSYNC-006: Upstream forwarding/passthrough hardening parity

> Status: Pending
> Priority: P1
> Depends on: `UPSYNC-001`
> Source: `docs/project/UPSTREAM_GAP_SSOT_2026-02-10.md`

## Goal

Close residual upstream forwarding edge cases with strict backward compatibility.

## Scope

- Verify and complete AccountTypeUpstream routing gates.
- Ensure passthrough behavior for success/error body and selected headers.
- Add missing nil-guards and regression tests in forwarding paths.

## Non-Goals

- No broad redesign of upstream architecture.

## Acceptance

1. Upstream account routes reach dedicated forwarding entry points.
2. Success/error passthrough is stable and test-covered.
3. No regressions for non-upstream account types.

## Verify

- `go test ./internal/service/... -run "Upstream|Forward|Passthrough" -count=1`
- `go test ./internal/handler/... -run "Upstream|Forward" -count=1`
- `go test ./...`

