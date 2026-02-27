# Frontend/Backend Contract Audit (SSOT)

> Last Updated: 2026-01-30
> Scope: 用户订阅进度 + 管理后台 OAuth/运维入口（Gemini/Google One、Dashboard 聚合、Qwen、OpenAI）

## 目标

- 审查并对齐前后端 **路由/参数/接口契约**（尤其是前端已封装但后端缺失、或后端已实现但前端未接入的场景）。
- 将缺口任务化（SSOT），并给出推进顺序与验收标准。

## 结论概览

### 已对齐/已实现（无需新增开发，仅需联调验证）

1. **用户订阅：单条订阅进度**
   - 前端：`frontend/src/api/subscriptions.ts#getSubscriptionProgress` 调用 `GET /api/v1/subscriptions/:id/progress`
   - 后端：`backend/internal/server/routes/user.go` 已存在 `subscriptions.GET("/:id/progress", ...)`
   - SSOT：`docs/project/tasks/SUB-007.md`

2. **管理后台：Gemini Google One Tier 刷新**
   - 后端：`POST /api/v1/admin/accounts/:id/refresh-tier`、`POST /api/v1/admin/accounts/batch-refresh-tier`
   - 前端：`frontend/src/api/admin/accounts.ts` 已封装 `refreshTier/batchRefreshTier`，Accounts UI 已有入口
   - SSOT：`docs/project/tasks/COMP-010.md`

3. **管理后台：Dashboard 预聚合回填（Backfill）**
   - 后端：`POST /api/v1/admin/dashboard/aggregation/backfill`
   - 前端：`frontend/src/api/admin/dashboard.ts#backfillAggregation` + `frontend/src/views/admin/DashboardView.vue` 已接入
   - SSOT：`docs/project/tasks/COMP-011.md`

### 已补齐（本轮完成）

4. **管理后台：Qwen OAuth 设备流轮询 + 刷新能力接入**
   - 前端补齐封装与 UI 入口，支持 device flow 轮询状态 + 账号刷新：
     - `POST /api/v1/admin/qwen/device/poll`
     - `POST /api/v1/admin/qwen/refresh-token`
     - `POST /api/v1/admin/qwen/accounts/:id/refresh`
   - 同时补齐通用 refresh：`POST /api/v1/admin/accounts/:id/refresh` 支持 `platform=qwen`
   - SSOT：`docs/project/tasks/COMP-012.md`

5. **管理后台：OpenAI OAuth refresh helpers 接入**
   - 前端新增 admin OpenAI API 模块并接入 Accounts 刷新入口：
     - `POST /api/v1/admin/openai/refresh-token`
     - `POST /api/v1/admin/openai/accounts/:id/refresh`
   - 后端补齐刷新后 token cache 失效处理，避免网关继续使用旧 token
   - SSOT：`docs/project/tasks/COMP-013.md`

## 参数/契约一致性抽查（OK）

- 分页参数：后端支持 `page` + `page_size`（兼容 `limit`），与前端一致：`backend/internal/pkg/response/response.go`
- 管理员用户列表过滤：前端 `status/role/search/attr[id]` 与后端解析一致：`backend/internal/handler/admin/user_handler.go`

## 任务地图（SSOT）

- SUB-007：订阅单条进度接口（已实现，补齐文档与验证）
- COMP-010：Gemini Google One tier refresh（已实现，补齐文档与验证）
- COMP-011：Dashboard 聚合回填（已实现，补齐文档与验证）
- COMP-012：Qwen OAuth poll/refresh 接入（已补齐）
- COMP-013：OpenAI OAuth refresh helpers 接入（已补齐）

## 验证证据（本地）

- 后端：`cd backend; go test ./...`
- 前端：`pnpm -C frontend test:run`、`pnpm -C frontend build`
- 运行态：`docker compose -f deploy/docker-compose.dev.yml ps`、`GET /health`、`POST /api/v1/auth/login`

## Contract Gate（当前）

- 本地审计命令：
  - `python tools/audit_api_contracts.py --strict`
  - `python tools/audit_api_contracts.py --include-mocks --strict`
- CI 门禁：
  - `.github/workflows/backend-ci.yml` 中 `contract-audit` job
- 分支保护勾选清单：
  - `docs/project/BRANCH_PROTECTION_REQUIRED_CHECKS.md`
- 分支保护实施步骤（runbook）：
  - `docs/project/BRANCH_PROTECTION_APPLY_RUNBOOK.md`

