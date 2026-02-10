# UPSYNC-012: Group drag-sort parity (schema/API/UI, compatibility-first)

> Status: Active
> Priority: P2
> Depends on: `UPSYNC-009`
> Source: `docs/project/UPSTREAM_GAP_SSOT_2026-02-10.md`

## Goal

Reimplement upstream group drag-and-drop sort behavior (`bac9e2bf`) while preserving fork compatibility and avoiding destructive migration risk.

## Scope

- Introduce stable `sort_order` data model support (DB + repository + service).
- Add admin API support for batch sort-order updates.
- Add frontend drag-sort UX in group management with safe persistence.
- Keep backward-compatible default ordering and fallback behavior.

## Non-Goals

- No forced destructive migration that can break existing group data.
- No unrelated redesign of group management UI.

## Acceptance

1. Admin can drag groups to reorder and persist order deterministically.
2. Existing installs without explicit `sort_order` continue to work with sensible defaults.
3. Group list ordering is consistent across API and UI reloads.

## Verify

- `go test ./internal/repository/... -run "Group|Sort" -count=1`
- `go test ./internal/service/... -run "Group|Sort" -count=1`
- `go test ./...`
- `pnpm -C frontend typecheck`
