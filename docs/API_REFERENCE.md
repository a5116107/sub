# Sub2API Backend API Reference

Base path: `/api/v1` (gateway endpoints are outside this prefix).

Standard response envelope (most endpoints):
```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

## Public (no auth)

### GET `/health`
**Auth**
- none

### GET `/setup/status`
**Auth**
- none

## Auth

### POST `/api/v1/auth/forgot-password`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- `Authorization: Bearer <jwt>`

### POST `/api/v1/auth/login`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- `Authorization: Bearer <jwt>`

### POST `/api/v1/auth/login/2fa`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/auth/me`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/auth/oauth/linuxdo/callback`
**Path params**
- (none)
**Query params**
- `code`
- `error`
- `error_description`
- `state`
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/auth/oauth/linuxdo/start`
**Path params**
- (none)
**Query params**
- `code`
- `error`
- `error_description`
- `redirect`
- `state`
**Auth**
- `Authorization: Bearer <jwt>`

### POST `/api/v1/auth/register`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- `Authorization: Bearer <jwt>`

### POST `/api/v1/auth/reset-password`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- `Authorization: Bearer <jwt>`

### POST `/api/v1/auth/send-verify-code`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- `Authorization: Bearer <jwt>`

### POST `/api/v1/auth/validate-promo-code`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/docs/:key`
**Path params**
- `key`
**Query params**
- `lang`
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/docs/pages`
**Path params**
- (none)
**Query params**
- `lang`
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/settings/public`
**Path params**
- `key`
**Query params**
- `lang`
**Auth**
- `Authorization: Bearer <jwt>`

## User (JWT)

### GET `/api/v1/announcements`
**Path params**
- `id`
**Query params**
- `unread_only`
**Auth**
- `Authorization: Bearer <jwt>`

### POST `/api/v1/announcements/:id/read`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/groups/available`
**Path params**
- (none)
**Query params**
- (none)
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/keys`
**Auth**
- `Authorization: Bearer <jwt>`

### POST `/api/v1/keys`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <jwt>`

### DELETE `/api/v1/keys/:id`
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/keys/:id`
**Auth**
- `Authorization: Bearer <jwt>`

### PUT `/api/v1/keys/:id`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <jwt>`

### POST `/api/v1/redeem`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/redeem/history`
**Path params**
- (none)
**Query params**
- (none)
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/subscriptions`
**Path params**
- `id`
**Query params**
- (none)
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/subscriptions/:id/progress`
**Path params**
- `id`
**Query params**
- (none)
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/subscriptions/active`
**Path params**
- `id`
**Query params**
- (none)
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/subscriptions/progress`
**Path params**
- `id`
**Query params**
- (none)
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/subscriptions/summary`
**Path params**
- (none)
**Query params**
- (none)
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/usage`
**Path params**
- `id`
**Query params**
- `api_key_id`
- `billing_type`
- `end_date`
- `model`
- `start_date`
- `stream`
- `timezone`
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/usage/:id`
**Path params**
- `id`
**Query params**
- `api_key_id`
- `end_date`
- `period`
- `start_date`
- `timezone`
**Auth**
- `Authorization: Bearer <jwt>`

### POST `/api/v1/usage/dashboard/api-keys-usage`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/usage/dashboard/models`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/usage/dashboard/stats`
**Path params**
- (none)
**Query params**
- `granularity`
**Request body**: JSON
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/usage/dashboard/trend`
**Path params**
- (none)
**Query params**
- `granularity`
**Request body**: JSON
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/usage/stats`
**Path params**
- (none)
**Query params**
- `api_key_id`
- `end_date`
- `granularity`
- `period`
- `start_date`
- `timezone`
**Auth**
- `Authorization: Bearer <jwt>`

### PUT `/api/v1/user`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <jwt>`

### PUT `/api/v1/user/password`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/user/profile`
**Auth**
- `Authorization: Bearer <jwt>`

### POST `/api/v1/user/totp/disable`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- `Authorization: Bearer <jwt>`

### POST `/api/v1/user/totp/enable`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- `Authorization: Bearer <jwt>`

### POST `/api/v1/user/totp/send-code`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <jwt>`

### POST `/api/v1/user/totp/setup`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/user/totp/status`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/user/totp/verification-method`
**Path params**
- (none)
**Query params**
- (none)
**Auth**
- `Authorization: Bearer <jwt>`

## Payments

### POST `/api/v1/payments/orders`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/payments/orders/:id`
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/payments/providers`
**Auth**
- `Authorization: Bearer <jwt>`

### POST `/api/v1/payments/webhooks/creem`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <jwt>`

### GET `/api/v1/payments/webhooks/epay`
**Auth**
- `Authorization: Bearer <jwt>`

### POST `/api/v1/payments/webhooks/epay`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <jwt>`

### POST `/api/v1/payments/webhooks/paypal`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <jwt>`

## Admin

### GET `/api/v1/admin/accounts`
**Path params**
- `id`
**Query params**
- `platform`
- `search`
- `status`
- `type`
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### DELETE `/api/v1/admin/accounts/:id`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/accounts/:id`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### PUT `/api/v1/admin/accounts/:id`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts/:id/clear-error`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts/:id/clear-rate-limit`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/accounts/:id/models`
**Path params**
- `id`
**Query params**
- (none)
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts/:id/refresh`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: (see implementation)
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts/:id/refresh-tier`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts/:id/schedulable`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/accounts/:id/stats`
**Path params**
- `id`
**Query params**
- `days`
**Request body**: JSON
**Auth**
- admin middleware

### DELETE `/api/v1/admin/accounts/:id/temp-unschedulable`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/accounts/:id/temp-unschedulable`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts/:id/test`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/accounts/:id/today-stats`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/accounts/:id/usage`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts/batch`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts/batch-refresh-tier`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts/batch-update-credentials`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts/bulk-update`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts/cookie-auth`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts/exchange-code`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts/exchange-setup-token-code`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts/generate-auth-url`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts/generate-setup-token-url`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts/setup-token-cookie-auth`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/accounts/sync/crs`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/announcements`
**Path params**
- `id`
**Query params**
- `search`
- `status`
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/announcements`
**Path params**
- `id`
**Query params**
- `search`
**Request body**: JSON
**Auth**
- admin middleware

### DELETE `/api/v1/admin/announcements/:id`
**Path params**
- `id`
**Query params**
- `search`
**Auth**
- admin middleware

### GET `/api/v1/admin/announcements/:id`
**Path params**
- `id`
**Query params**
- `search`
**Request body**: JSON
**Auth**
- admin middleware

### PUT `/api/v1/admin/announcements/:id`
**Path params**
- `id`
**Query params**
- `search`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/announcements/:id/read-status`
**Path params**
- `id`
**Query params**
- `search`
**Auth**
- admin middleware

### POST `/api/v1/admin/antigravity/oauth/auth-url`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/antigravity/oauth/exchange-code`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/dashboard/aggregation/backfill`
**Path params**
- (none)
**Query params**
- `account_id`
- `api_key_id`
- `billing_type`
- `granularity`
- `group_id`
- `model`
- `stream`
- `user_id`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/dashboard/api-keys-trend`
**Path params**
- (none)
**Query params**
- `granularity`
- `limit`
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/dashboard/api-keys-usage`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/dashboard/models`
**Path params**
- (none)
**Query params**
- `account_id`
- `api_key_id`
- `billing_type`
- `granularity`
- `group_id`
- `limit`
- `stream`
- `user_id`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/dashboard/realtime`
**Path params**
- (none)
**Query params**
- `account_id`
- `api_key_id`
- `billing_type`
- `granularity`
- `group_id`
- `limit`
- `model`
- `stream`
- `user_id`
**Auth**
- admin middleware

### GET `/api/v1/admin/dashboard/stats`
**Path params**
- (none)
**Query params**
- `account_id`
- `api_key_id`
- `granularity`
- `group_id`
- `model`
- `stream`
- `user_id`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/dashboard/trend`
**Path params**
- (none)
**Query params**
- `account_id`
- `api_key_id`
- `billing_type`
- `granularity`
- `group_id`
- `limit`
- `model`
- `stream`
- `user_id`
**Auth**
- admin middleware

### GET `/api/v1/admin/dashboard/users-trend`
**Path params**
- (none)
**Query params**
- `granularity`
- `limit`
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/dashboard/users-usage`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/docs/:key`
**Path params**
- `key`
**Query params**
- `lang`
**Request body**: JSON
**Auth**
- admin middleware

### PUT `/api/v1/admin/docs/:key`
**Path params**
- `key`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/docs/pages`
**Path params**
- `key`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/docs/pages`
**Path params**
- `key`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### DELETE `/api/v1/admin/docs/pages/:key`
**Path params**
- `key`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### PUT `/api/v1/admin/docs/pages/:key`
**Path params**
- `key`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/gemini/oauth/auth-url`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/gemini/oauth/capabilities`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/gemini/oauth/exchange-code`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/groups`
**Path params**
- `id`
**Query params**
- `is_exclusive`
- `platform`
- `search`
- `status`
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/groups`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### DELETE `/api/v1/admin/groups/:id`
**Path params**
- `id`
**Query params**
- (none)
**Auth**
- admin middleware

### GET `/api/v1/admin/groups/:id`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### PUT `/api/v1/admin/groups/:id`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/groups/:id/api-keys`
**Path params**
- `id`
**Query params**
- (none)
**Auth**
- admin middleware

### GET `/api/v1/admin/groups/:id/stats`
**Path params**
- `id`
**Query params**
- (none)
**Auth**
- admin middleware

### GET `/api/v1/admin/groups/:id/subscriptions`
**Path params**
- `id`
**Query params**
- (none)
**Auth**
- admin middleware

### GET `/api/v1/admin/groups/all`
**Path params**
- `id`
**Query params**
- `platform`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/model-pricing/download`
**Path params**
- (none)
**Query params**
- `override`
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/model-pricing/import`
**Path params**
- (none)
**Query params**
- `override`
**Request body**: JSON
**Auth**
- admin middleware

### PUT `/api/v1/admin/model-pricing/override`
**Path params**
- (none)
**Query params**
- `override`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/model-pricing/status`
**Path params**
- (none)
**Query params**
- `override`
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/model-pricing/sync`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/openai/accounts/:id/refresh`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/openai/create-from-oauth`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/openai/exchange-code`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/openai/generate-auth-url`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/openai/refresh-token`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/account-availability`
**Path params**
- (none)
**Query params**
- `group_id`
- `platform`
- `window`
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/advanced-settings`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### PUT `/api/v1/admin/ops/advanced-settings`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/alert-events`
**Path params**
- (none)
**Query params**
- `before_fired_at`
- `before_id`
- `email_sent`
- `end_time`
- `group_id`
- `limit`
- `platform`
- `severity`
- `start_time`
- `status`
- `time_range`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/alert-events/:id`
**Path params**
- `id`
**Query params**
- `email_sent`
- `limit`
- `severity`
- `status`
**Request body**: JSON
**Auth**
- admin middleware

### PUT `/api/v1/admin/ops/alert-events/:id/status`
**Path params**
- `id`
**Query params**
- `before_fired_at`
- `before_id`
- `email_sent`
- `limit`
- `severity`
- `status`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/alert-rules`
**Path params**
- `id`
**Query params**
- (none)
**Auth**
- admin middleware

### POST `/api/v1/admin/ops/alert-rules`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: (see implementation)
**Auth**
- admin middleware

### DELETE `/api/v1/admin/ops/alert-rules/:id`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### PUT `/api/v1/admin/ops/alert-rules/:id`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/ops/alert-silences`
**Request body**: (see implementation)
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/concurrency`
**Path params**
- (none)
**Query params**
- `group_id`
- `platform`
- `window`
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/dashboard/error-distribution`
**Path params**
- (none)
**Query params**
- `group_id`
- `mode`
- `platform`
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/dashboard/error-trend`
**Path params**
- (none)
**Query params**
- `group_id`
- `mode`
- `platform`
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/dashboard/latency-histogram`
**Path params**
- (none)
**Query params**
- `group_id`
- `mode`
- `platform`
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/dashboard/overview`
**Path params**
- (none)
**Query params**
- `group_id`
- `platform`
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/dashboard/throughput-trend`
**Path params**
- (none)
**Query params**
- `group_id`
- `platform`
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/email-notification/config`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### PUT `/api/v1/admin/ops/email-notification/config`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/errors`
**Path params**
- (none)
**Query params**
- `account_id`
- `error_owner`
- `error_source`
- `group_id`
- `phase`
- `platform`
- `q`
- `resolved`
- `status_codes`
- `user_query`
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/errors/:id`
**Path params**
- `id`
**Query params**
- `account_id`
- `error_owner`
- `error_source`
- `group_id`
- `phase`
- `platform`
- `q`
- `resolved`
- `status_codes`
- `user_query`
- `view`
**Auth**
- admin middleware

### PUT `/api/v1/admin/ops/errors/:id/resolve`
**Path params**
- `id`
**Query params**
- `end_time`
- `start_time`
- `time_range`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/errors/:id/retries`
**Path params**
- `id`
**Query params**
- `end_time`
- `limit`
- `start_time`
- `time_range`
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/ops/errors/:id/retry`
**Path params**
- `id`
**Query params**
- `end_time`
- `limit`
- `start_time`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/realtime-traffic`
**Path params**
- (none)
**Query params**
- `group_id`
- `platform`
- `window`
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/request-errors`
**Path params**
- `id`
**Query params**
- `account_id`
- `error_owner`
- `error_source`
- `group_id`
- `phase`
- `platform`
- `q`
- `resolved`
- `status_codes`
- `user_query`
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/request-errors/:id`
**Path params**
- `id`
**Query params**
- `error_source`
- `include_detail`
- `platform`
- `q`
**Auth**
- admin middleware

### PUT `/api/v1/admin/ops/request-errors/:id/resolve`
**Path params**
- `id`
**Query params**
- `account_id`
- `error_source`
- `group_id`
- `platform`
- `q`
- `resolved`
- `status_codes`
**Request body**: (see implementation)
**Auth**
- admin middleware

### POST `/api/v1/admin/ops/request-errors/:id/retry-client`
**Path params**
- `id`
- `idx`
**Query params**
- `account_id`
- `error_source`
- `group_id`
- `platform`
- `q`
- `resolved`
- `status_codes`
**Request body**: (see implementation)
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/request-errors/:id/upstream-errors`
**Path params**
- `id`
- `idx`
**Query params**
- `error_source`
- `include_detail`
- `platform`
- `q`
**Auth**
- admin middleware

### POST `/api/v1/admin/ops/request-errors/:id/upstream-errors/:idx/retry`
**Path params**
- `id`
- `idx`
**Query params**
- `account_id`
- `error_source`
- `group_id`
- `platform`
- `q`
- `resolved`
- `status_codes`
**Request body**: (see implementation)
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/requests`
**Path params**
- `id`
**Query params**
- `account_id`
- `api_key_id`
- `group_id`
- `kind`
- `max_duration_ms`
- `min_duration_ms`
- `model`
- `platform`
- `q`
- `request_id`
- `sort`
- `user_id`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/runtime/alert`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### PUT `/api/v1/admin/ops/runtime/alert`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/settings/metric-thresholds`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### PUT `/api/v1/admin/ops/settings/metric-thresholds`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/upstream-errors`
**Path params**
- `id`
**Query params**
- `account_id`
- `error_source`
- `group_id`
- `platform`
- `q`
- `resolved`
- `status_codes`
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/upstream-errors/:id`
**Path params**
- `id`
**Query params**
- `account_id`
- `api_key_id`
- `group_id`
- `kind`
- `max_duration_ms`
- `min_duration_ms`
- `model`
- `platform`
- `q`
- `request_id`
- `sort`
- `user_id`
**Auth**
- admin middleware

### PUT `/api/v1/admin/ops/upstream-errors/:id/resolve`
**Path params**
- `id`
**Query params**
- `account_id`
- `api_key_id`
- `group_id`
- `kind`
- `max_duration_ms`
- `min_duration_ms`
- `model`
- `platform`
- `q`
- `request_id`
- `sort`
- `user_id`
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/ops/upstream-errors/:id/retry`
**Path params**
- `id`
**Query params**
- `account_id`
- `api_key_id`
- `group_id`
- `kind`
- `max_duration_ms`
- `min_duration_ms`
- `model`
- `platform`
- `q`
- `request_id`
- `sort`
- `user_id`
**Request body**: (see implementation)
**Auth**
- admin middleware

### GET `/api/v1/admin/ops/ws/qps`
**Path params**
- (none)
**Query params**
- (none)
**Auth**
- admin middleware

### GET `/api/v1/admin/promo-codes`
**Path params**
- `id`
**Query params**
- `search`
- `status`
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/promo-codes`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### DELETE `/api/v1/admin/promo-codes/:id`
**Path params**
- `id`
**Query params**
- (none)
**Auth**
- admin middleware

### GET `/api/v1/admin/promo-codes/:id`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### PUT `/api/v1/admin/promo-codes/:id`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/promo-codes/:id/usages`
**Path params**
- `id`
**Query params**
- (none)
**Auth**
- admin middleware

### GET `/api/v1/admin/proxies`
**Path params**
- `id`
**Query params**
- `protocol`
- `search`
- `status`
- `with_count`
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/proxies`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### DELETE `/api/v1/admin/proxies/:id`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/proxies/:id`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### PUT `/api/v1/admin/proxies/:id`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/proxies/:id/accounts`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/proxies/:id/stats`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/proxies/:id/test`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/proxies/all`
**Path params**
- `id`
**Query params**
- `with_count`
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/proxies/batch`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/proxies/batch-delete`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/qwen/accounts/:id/refresh`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/qwen/create-from-device`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/qwen/device/poll`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/qwen/device/start`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/qwen/refresh-token`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/redeem-codes`
**Path params**
- `id`
**Query params**
- `search`
- `status`
- `type`
**Request body**: JSON
**Auth**
- admin middleware

### DELETE `/api/v1/admin/redeem-codes/:id`
**Path params**
- `id`
**Query params**
- `status`
- `type`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/redeem-codes/:id`
**Path params**
- `id`
**Query params**
- `status`
- `type`
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/redeem-codes/:id/expire`
**Path params**
- `id`
**Query params**
- `status`
- `type`
**Request body**: (see implementation)
**Auth**
- admin middleware

### POST `/api/v1/admin/redeem-codes/batch-delete`
**Path params**
- `id`
**Query params**
- `status`
- `type`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/redeem-codes/export`
**Path params**
- (none)
**Query params**
- `status`
- `type`
**Auth**
- admin middleware

### POST `/api/v1/admin/redeem-codes/generate`
**Path params**
- `id`
**Query params**
- `status`
- `type`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/redeem-codes/stats`
**Path params**
- (none)
**Query params**
- `status`
- `type`
**Auth**
- admin middleware

### GET `/api/v1/admin/settings`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### PUT `/api/v1/admin/settings`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### DELETE `/api/v1/admin/settings/admin-api-key`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/settings/admin-api-key`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/settings/admin-api-key/regenerate`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/settings/send-test-email`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/settings/stream-timeout`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### PUT `/api/v1/admin/settings/stream-timeout`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/settings/test-smtp`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/subscriptions`
**Path params**
- `id`
**Query params**
- `group_id`
- `sort_by`
- `sort_order`
- `status`
- `user_id`
**Request body**: JSON
**Auth**
- admin middleware

### DELETE `/api/v1/admin/subscriptions/:id`
**Path params**
- `id`
**Query params**
- (none)
**Auth**
- admin middleware

### GET `/api/v1/admin/subscriptions/:id`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/subscriptions/:id/extend`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/subscriptions/:id/progress`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/subscriptions/assign`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/subscriptions/bulk-assign`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/system/check-updates`
**Path params**
- (none)
**Query params**
- `force`
**Auth**
- admin middleware

### POST `/api/v1/admin/system/restart`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: (see implementation)
**Auth**
- admin middleware

### POST `/api/v1/admin/system/rollback`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: (see implementation)
**Auth**
- admin middleware

### POST `/api/v1/admin/system/update`
**Path params**
- (none)
**Query params**
- (none)
**Request body**: (see implementation)
**Auth**
- admin middleware

### GET `/api/v1/admin/system/version`
**Path params**
- (none)
**Query params**
- `force`
**Auth**
- admin middleware

### GET `/api/v1/admin/usage`
**Path params**
- (none)
**Query params**
- `account_id`
- `api_key_id`
- `billing_type`
- `end_date`
- `group_id`
- `model`
- `start_date`
- `stream`
- `timezone`
- `user_id`
**Auth**
- admin middleware

### GET `/api/v1/admin/usage/cleanup-tasks`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/usage/cleanup-tasks`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/usage/cleanup-tasks/:id/cancel`
**Path params**
- `id`
**Query params**
- (none)
**Request body**: (see implementation)
**Auth**
- admin middleware

### GET `/api/v1/admin/usage/search-api-keys`
**Path params**
- (none)
**Query params**
- `q`
- `user_id`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/usage/search-users`
**Path params**
- (none)
**Query params**
- `q`
- `user_id`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/usage/stats`
**Path params**
- (none)
**Query params**
- `account_id`
- `api_key_id`
- `billing_type`
- `end_date`
- `group_id`
- `model`
- `period`
- `q`
- `start_date`
- `stream`
- `timezone`
- `user_id`
**Auth**
- admin middleware

### GET `/api/v1/admin/user-attributes`
**Auth**
- admin middleware

### POST `/api/v1/admin/user-attributes`
**Request body**: (see implementation)
**Auth**
- admin middleware

### DELETE `/api/v1/admin/user-attributes/:id`
**Auth**
- admin middleware

### PUT `/api/v1/admin/user-attributes/:id`
**Request body**: (see implementation)
**Auth**
- admin middleware

### POST `/api/v1/admin/user-attributes/batch`
**Request body**: (see implementation)
**Auth**
- admin middleware

### PUT `/api/v1/admin/user-attributes/reorder`
**Request body**: (see implementation)
**Auth**
- admin middleware

### GET `/api/v1/admin/users`
**Path params**
- `id`
**Query params**
- `role`
- `search`
- `status`
**Request body**: JSON
**Auth**
- admin middleware

### POST `/api/v1/admin/users`
**Path params**
- `id`
**Query params**
- `period`
**Request body**: JSON
**Auth**
- admin middleware

### DELETE `/api/v1/admin/users/:id`
**Path params**
- `id`
**Query params**
- `period`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/users/:id`
**Path params**
- `id`
**Query params**
- `period`
**Request body**: JSON
**Auth**
- admin middleware

### PUT `/api/v1/admin/users/:id`
**Path params**
- `id`
**Query params**
- `period`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/users/:id/api-keys`
**Path params**
- `id`
**Query params**
- `period`
**Auth**
- admin middleware

### GET `/api/v1/admin/users/:id/attributes`
**Auth**
- admin middleware

### PUT `/api/v1/admin/users/:id/attributes`
**Request body**: (see implementation)
**Auth**
- admin middleware

### POST `/api/v1/admin/users/:id/balance`
**Path params**
- `id`
**Query params**
- `period`
**Request body**: JSON
**Auth**
- admin middleware

### GET `/api/v1/admin/users/:id/subscriptions`
**Path params**
- `id`
**Query params**
- (none)
**Auth**
- admin middleware

### GET `/api/v1/admin/users/:id/usage`
**Path params**
- `id`
**Query params**
- `period`
**Auth**
- admin middleware

## Gateway (API Key)

### GET `/antigravity/models`
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/antigravity/v1/messages`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/antigravity/v1/messages/count_tokens`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/antigravity/v1/models`
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/antigravity/v1/usage`
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/antigravity/v1beta/models`
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/antigravity/v1beta/models/*modelAction`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/antigravity/v1beta/models/:model`
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/api/event_logging/batch`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/api/provider/anthropic/messages`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/api/provider/anthropic/messages/count_tokens`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/api/provider/anthropic/models`
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/api/provider/anthropic/usage`
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/api/provider/anthropic/v1/messages`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/api/provider/anthropic/v1/messages/count_tokens`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/api/provider/anthropic/v1/models`
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/api/provider/anthropic/v1/usage`
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/api/provider/gemini/v1beta/models`
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/api/provider/gemini/v1beta/models/*modelAction`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/api/provider/gemini/v1beta/models/:model`
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/api/provider/google/v1beta/models`
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/api/provider/google/v1beta/models/*modelAction`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/api/provider/google/v1beta/models/:model`
**Auth**
- `Authorization: Bearer <api_key>`

### ANY `/api/provider/google/v1beta1/*path`
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/api/provider/openai/chat/completions`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/api/provider/openai/completions`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/api/provider/openai/models`
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/api/provider/openai/responses`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/api/provider/openai/v1/chat/completions`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/api/provider/openai/v1/completions`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/api/provider/openai/v1/models`
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/api/provider/openai/v1/responses`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/responses`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/v1/chat/completions`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/v1/completions`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/v1/messages`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/v1/messages/count_tokens`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/v1/models`
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/v1/responses`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/v1/usage`
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/v1beta/models`
**Auth**
- `Authorization: Bearer <api_key>`

### POST `/v1beta/models/*modelAction`
**Request body**: (see implementation)
**Auth**
- `Authorization: Bearer <api_key>`

### GET `/v1beta/models/:model`
**Auth**
- `Authorization: Bearer <api_key>`
