# UPSYNC-009: Admin/UI parity pack (non-destructive)

> Status: Active
> Priority: P2
> Depends on: `UPSYNC-004`, `UPSYNC-005`
> Source: `docs/project/UPSTREAM_GAP_SSOT_2026-02-10.md`

## Goal

Absorb high-value admin/UI parity items while preserving existing UX flows.

## Scope

- Group selector/badge props consistency.
- Account table toolbar layout harmonization.
- OpenAI OAuth batch RT input creation flow parity.
- Optional group sort drag-and-drop parity.

## Non-Goals

- No large-scale frontend redesign.
- No CSS framework migration.

## Acceptance

1. Target UI parity items are present and type-safe.
2. Existing admin pages maintain behavior and no broken interactions.
3. Feature flags or safe defaults exist for higher-risk UI changes.

## Verify

- `pnpm -C frontend typecheck`
- `pnpm -C frontend test:run` (if tests exist for touched modules)
- `go test ./internal/handler/...` (for related API contract updates)
