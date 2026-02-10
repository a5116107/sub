# UPSYNC-007: Claude/OAuth compatibility residual parity

> Status: Active
> Priority: P1
> Depends on: `UPSYNC-001`
> Source: `docs/project/UPSTREAM_GAP_SSOT_2026-02-10.md`

## Goal

Close remaining Claude/OAuth edge compatibility without touching fork-only custom behavior.

## Scope

- Align residual header/beta/session metadata edge handling.
- Re-check mimic-mode gating for tool-name and metadata rewrites.
- Add tests for auth-type specific Claude account headers.

## Non-Goals

- No removal of existing fork-only OAuth features.

## Acceptance

1. Claude/OAuth behavior is stable across mimic/non-mimic paths.
2. Auth-type header differences are explicit and test-covered.
3. Existing upstream-compatible patches remain green.

## Verify

- `go test ./internal/service/... -run "Claude|OAuth|Mimic|Metadata|Header" -count=1`
- `go test ./internal/handler/... -run "Claude|OAuth" -count=1`
- `go test ./...`
