# UPSYNC-001: Baseline lock and gap evidence refresh

> Status: Completed
> Priority: P1
> Source: `docs/project/UPSTREAM_GAP_SSOT_2026-02-10.md`

## Goal

Create a reproducible baseline for upstream sync work so all following tasks operate on the same evidence.

## Scope

- Refresh divergence and tag-gap evidence.
- Refresh right-only commit clusters by capability.
- Keep SSOT docs synchronized.

## Non-Goals

- No runtime behavior change.
- No merge/rebase of unrelated branches.

## Deliverables

- Updated SSOT matrix:
  - `docs/project/UPSTREAM_GAP_SSOT_2026-02-10.md`
- Tracker entries for all UPSYNC tasks:
  - `docs/project/TASK_TRACKER.md`

## Acceptance

1. Divergence (`ahead/behind`) and missing tags are documented with current values.
2. Every planned upstream gap category maps to a task ID.
3. Execution order and verification pack are explicit.

## Verify

- `git rev-list --left-right --cherry-pick --count HEAD...origin/main`
- `git describe --tags --abbrev=0 HEAD`
- `git describe --tags --abbrev=0 origin/main`
