# UPSYNC-010: Digest session store migration (flat cache, compatibility-first)

> Status: Pending
> Priority: P2
> Depends on: `UPSYNC-006`, `UPSYNC-008`
> Source: `docs/project/UPSTREAM_GAP_SSOT_2026-02-10.md`

## Goal

Migrate digest session store internals from trie-heavy implementation to a flat-cache model with compatibility controls.

## Scope

- Introduce new store implementation behind compatibility gate.
- Keep old behavior available during transition.
- Add migration and rollback notes.

## Non-Goals

- No immediate destructive data format migration without fallback.

## Acceptance

1. New flat-cache path can be enabled safely.
2. Existing sticky/session behavior remains functionally equivalent.
3. Rollback path is documented and tested.

## Verify

- `go test ./internal/service/... -run "Session|Digest|Sticky|Cache" -count=1`
- `go test ./internal/repository/... -run "GatewayCache|Session" -count=1`
- `go test ./...`

