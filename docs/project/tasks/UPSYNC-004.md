# UPSYNC-004: Model-level rate-limit clear/reset parity (backend + UI)

> Status: Active
> Priority: P1
> Depends on: `UPSYNC-001`
> Source: `docs/project/UPSTREAM_GAP_SSOT_2026-02-10.md`

## Goal

Complete model-level rate-limit governance parity while preserving current API compatibility.

## Scope

- Backend:
  - Verify/complete clear-rate-limit action to clear model-level limits and temp-unsched state.
  - Align DTO fields for model-level visibility without breaking existing scope fields.
- Frontend:
  - Expose clear/reset action in account menus based on model-level states.
  - Keep backward-compatible rendering for old fields.

## Non-Goals

- No destructive removal of existing scope fields in this phase.

## Acceptance

1. Admin can clear effective model-level rate limits from action menu.
2. Temp-unsched reset and rate-limit clear are consistent.
3. Existing accounts page behavior remains backward compatible.

## Verify

- `go test ./internal/handler/...`
- `go test ./internal/service/... -run "RateLimit|TempUnsched|ModelRate" -count=1`
- `pnpm -C frontend typecheck`
