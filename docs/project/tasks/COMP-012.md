# COMP-012: Admin: Qwen OAuth poll + refresh UI wiring

> Status: ✅ Done (2026-01-30)
> 验证：`cd backend; go test ./...`、`pnpm -C frontend test:run`、`pnpm -C frontend build`

## 背景/问题

Qwen OAuth 采用设备流（device flow）。后端能力已齐全，但前端目前仅接入：

- `POST /api/v1/admin/qwen/device/start`
- `POST /api/v1/admin/qwen/create-from-device`（内部会 poll 一次）

缺口：

- 设备流轮询 token（前端无法展示“已授权/未授权/过期”的过程，也无法按 interval 自动轮询）
- Qwen token 刷新与指定账号刷新能力在前端未接入：
  - `POST /api/v1/admin/qwen/refresh-token`
  - `POST /api/v1/admin/qwen/accounts/:id/refresh`

另外：现有通用刷新接口 `POST /api/v1/admin/accounts/:id/refresh` 目前不支持 `platform=qwen`，会走到 Anthropic OAuth 分支，导致“刷新 token”动作对 Qwen 账号不可用。

## 目标

- 让前端在 device flow 中支持 **按 interval 轮询**（或手动轮询）并清晰反馈状态
- 让管理员能对 Qwen OAuth 账号执行“刷新 token”（至少在 Accounts 页面可用）
- 保持接口契约/参数与后端一致

## 实施范围（建议）

### Frontend

- `frontend/src/api/admin/qwen.ts` 增补：
  - `pollDeviceFlowToken({ session_id })`
  - `refreshToken({ refresh_token, proxy_id? })`
  - `refreshAccountToken(id)`
- `frontend/src/composables/useQwenOAuth.ts` 增补轮询状态管理：
  - `pollOnce / startPolling / stopPolling`（基于后端返回的 `interval`）
  - 授权完成后允许继续创建账号（或自动进入创建）
- Accounts 页面：对 `platform=qwen` 的账号，“刷新 token”动作走 Qwen 专用 endpoint（或后端补齐通用 refresh 分支）

### Backend（可选，但推荐）

- 在 `POST /api/v1/admin/accounts/:id/refresh` 中补齐 `platform=qwen` 分支，使用 `QwenOAuthService` 刷新并更新凭证
  - 这样可避免前端增加大量 platform 特判逻辑

## 验收标准

- Qwen 设备流：能在 UI 中看到“等待授权/已授权/失败”并可继续创建账号
- Qwen 账号刷新：在 Accounts 中点击“刷新 token”不会再走错 provider 分支导致失败
- 不影响 Gemini/OpenAI/Claude 等已有刷新逻辑

## 验证建议

- `cd backend; go test ./...`
- `pnpm -C frontend test:run`
- `pnpm -C frontend build`

## 实际实现（落地）

### Frontend

- 补齐 Qwen API 封装：`frontend/src/api/admin/qwen.ts`
  - `pollDeviceFlowToken()` / `refreshToken()` / `refreshAccountToken()`
- 完善 device flow 状态管理：`frontend/src/composables/useQwenOAuth.ts`
  - 增加 `tokenInfo`、`pollDeviceFlowTokenOnce()`、`buildCredentials()`
  - 对 `authorization_pending` 视为“未完成授权”的非致命状态（便于轮询）
- 设备流创建账号体验优化：`frontend/src/components/account/CreateAccountModal.vue`
  - 增加“检查授权状态”按钮
  - 授权完成后走通用账号创建（`admin/accounts`），避免强绑定一次性 create-from-device

### Backend

- 通用 refresh 补齐 Qwen 分支：`backend/internal/handler/admin/account_handler.go`
  - `POST /api/v1/admin/accounts/:id/refresh` 现在支持 `platform=qwen`

