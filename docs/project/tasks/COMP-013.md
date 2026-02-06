# COMP-013: Admin: OpenAI OAuth refresh helpers UI wiring

> Status: ✅ Done (2026-01-30)
> 验证：`cd backend; go test ./...`、`pnpm -C frontend test:run`、`pnpm -C frontend build`

## 背景/问题

OpenAI OAuth 账号在后台存在 refresh helper endpoints，便于排障/手工刷新/脚本化：

- `POST /api/v1/admin/openai/refresh-token`（输入 refresh_token 刷新）
- `POST /api/v1/admin/openai/accounts/:id/refresh`（按账号刷新）
- `POST /api/v1/admin/openai/create-from-oauth`（可选：后端一键 exchange+create）

前端当前主要使用：

- `POST /api/v1/admin/openai/generate-auth-url`
- `POST /api/v1/admin/openai/exchange-code`

并通过通用 `admin/accounts` 创建/更新账号。

## 目标

- 在不破坏现有创建/再授权流程的前提下，为管理员提供 **可见入口** 来使用 OpenAI refresh helpers（至少接入 `accounts/:id/refresh`；`refresh-token` 作为高级工具可选）

## 实施范围（建议）

### Frontend

- 增补 API 封装（可放在新文件 `frontend/src/api/admin/openai.ts`，或并入现有 composable）：
  - `refreshToken({ refresh_token, proxy_id? })`
  - `refreshAccountToken(id)`
  - `createFromOAuth({ session_id, code, proxy_id?, name?, concurrency?, priority?, group_ids? })`（可选）
- 在 Accounts 页面或 ReAuth 模态中增加入口：
  - 对 `platform=openai` 的账号，提供“使用 OpenAI 专用接口刷新 token”按钮（调用 `/admin/openai/accounts/:id/refresh`）
  - （可选）提供“手工 refresh_token 刷新”小工具（避免把敏感 token 打进日志/提示中）

## 验收标准

- OpenAI OAuth 账号可从 UI 触发 `/admin/openai/accounts/:id/refresh` 并更新凭证（成功/失败提示清晰）
- 不影响现有 OpenAI OAuth 创建/再授权流程

## 验证建议

- `pnpm -C frontend test:run`
- `pnpm -C frontend build`

## 实际实现（落地）

### Frontend

- 新增 OpenAI 管理端 API 模块并挂载：`frontend/src/api/admin/openai.ts`、`frontend/src/api/admin/index.ts`
  - `refreshToken()` / `refreshAccountToken()` / `generateAuthUrl()` / `exchangeCode()`
- 统一使用 adminAPI.openai：`frontend/src/composables/useOpenAIOAuth.ts`
- Accounts 刷新动作按平台走专用 endpoint：`frontend/src/views/admin/AccountsView.vue`

### Backend

- OpenAI 刷新后立即失效 token cache：`backend/internal/handler/admin/openai_oauth_handler.go`

