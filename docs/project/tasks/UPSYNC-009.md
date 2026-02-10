# UPSYNC-009: Admin/UI parity pack (non-destructive)

> Status: Completed
> Priority: P2
> Depends on: `UPSYNC-004`, `UPSYNC-005`
> Source: `docs/project/UPSTREAM_GAP_SSOT_2026-02-10.md`

## Goal

Absorb high-value admin/UI parity items while preserving existing UX flows.

## Scope

- Group selector/badge props consistency (`470b37be` equivalent).
- Account table toolbar layout harmonization (`b1c30df8` equivalent).
- OpenAI OAuth batch RT input creation flow parity (`8a0a8558` equivalent).
- Group drag-sort parity (`bac9e2bf`) is split into follow-up task `UPSYNC-012`.

## Non-Goals

- No large-scale frontend redesign.
- No CSS framework migration.

## Acceptance

1. Target UI parity items are present and type-safe.
2. Existing admin pages maintain behavior and no broken interactions.
3. Higher-risk drag-sort schema/API migration is isolated as a separate task.

## Verify

- `pnpm -C frontend typecheck`
- `pnpm -C frontend test:run` (if tests exist for touched modules)
- `go test ./internal/handler/...` (for related API contract updates)

## Delivery Notes (2026-02-10)

- `GroupSelector` now passes `platform` to `GroupBadge` and keeps platform-filter logic stable.
- Admin toolbar layout unified in:
  - `frontend/src/views/admin/AnnouncementsView.vue`
  - `frontend/src/views/admin/PromoCodesView.vue`
  - `frontend/src/views/admin/RedeemView.vue`
  - `frontend/src/views/admin/UsersView.vue`
- OpenAI OAuth now supports manual/batch Refresh Token input flow:
  - `OAuthAuthorizationFlow` supports `refresh_token` mode and emits validation event.
  - `CreateAccountModal` supports batch RT validation + account creation feedback.
  - `useOpenAIOAuth` and `accountsAPI` expose RT validation endpoint usage.
  - Added i18n keys for batch/RT flow in `en.ts` and `zh.ts`.

## Verification Evidence

- `pnpm -C frontend typecheck` ✅
- `pnpm -C frontend test:run` ✅
