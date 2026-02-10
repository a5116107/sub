# UPSYNC-002: Failover runtime parity (linear delay + cache billing exemption)

> Status: Pending
> Priority: P0
> Depends on: `UPSYNC-001`
> Source: `docs/project/UPSTREAM_GAP_SSOT_2026-02-10.md`

## Goal

Match upstream failover behavior for Antigravity switch loops without breaking existing fork behavior.

## Scope

- Add linear delay between Antigravity account failover switches in:
  - `backend/internal/handler/gateway_handler.go`
  - `backend/internal/handler/gemini_v1beta_handler.go`
- Add sticky-session failover cache-billing exemption helper and data propagation.
- Extend failover error model only with backward-compatible fields.

## Non-Goals

- No scheduler algorithm rewrite.
- No UI changes.

## Acceptance

1. Switch delay applies as `0s, 1s, 2s...` for switch counts `1,2,3...`.
2. Sticky-session failover triggers forced cache-billing exemption.
3. No regression for non-Antigravity paths.

## Verify

- `go test ./internal/handler/...`
- `go test ./internal/service/... -run "Failover|Sticky|CacheBilling|Disconnect" -count=1`
- `go test ./...`

