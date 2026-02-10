# UPSYNC-011: Closure gate (tag parity, residual diff triage, release-readiness)

> Status: Pending
> Priority: P2
> Depends on: `UPSYNC-002`, `UPSYNC-003`, `UPSYNC-004`, `UPSYNC-005`, `UPSYNC-006`, `UPSYNC-007`, `UPSYNC-008`, `UPSYNC-009`, `UPSYNC-010`
> Source: `docs/project/UPSTREAM_GAP_SSOT_2026-02-10.md`

## Goal

Define and execute final closure criteria for this upsync program.

## Scope

- Re-audit unresolved right-only upstream commits and classify:
  - absorbed by equivalence
  - intentionally diverged
  - still missing
- Produce final closure report with risk rating.
- Confirm release-readiness gates.

## Non-Goals

- No forced “0 behind” objective by destructive merge.

## Acceptance

1. Residual upstream gap list is explicit and justified.
2. Closure report references task-level evidence.
3. Release-readiness checklist is complete.

## Verify

- `git rev-list --left-right --cherry-pick --count HEAD...origin/main`
- `go test ./internal/service/...`
- `go test ./...`
- `pnpm -C frontend typecheck`

