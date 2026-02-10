# UPSYNC-005: CRS sync preview + selective account sync

> Status: Completed
> Priority: P1
> Depends on: `UPSYNC-001`
> Source: `docs/project/UPSTREAM_GAP_SSOT_2026-02-10.md`

## Goal

Add CRS sync preview and selectable-account sync, not only one-click full sync.

## Scope

- Backend:
  - Extend CRS sync input with preview/selective fields.
  - Add preview response details for UI diff rendering.
- Frontend:
  - Add preview step and account selection in CRS sync modal.
  - Preserve current one-click path as fallback.

## Non-Goals

- No breaking API changes for existing CRS sync callers.

## Acceptance

1. Admin can preview sync result without applying changes.
2. Admin can sync only selected CRS accounts.
3. Existing sync path still works when selection is not provided.

## Verify

- `go test ./internal/service/... -run "CRS|Sync" -count=1`
- `go test ./internal/handler/... -run "CRS|Sync" -count=1`
- `pnpm -C frontend typecheck`
