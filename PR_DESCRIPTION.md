## 概要

本 PR 合并 `feat/apikey-policy-quota-strict` 分支到目标仓库主分支，主要聚焦于：

- 网关与上游转发的安全/健壮性增强（请求体读取限制、URL 校验、上游信息保密）
- 计费链路增强（缓存、幂等锁、异步落盘/补偿能力）
- 管理端模型定价能力补齐（后端接口 + 前端页面）
- 前端管理台体验优化（组件、导航、筛选/批量操作）
- 文档与运维脚本补充

---

## 主要变更

### 1) 后端安全与稳定性

- 新增并接入 HTTP body 读取上限，降低超大请求导致的资源风险
- 强化 URL 校验能力（含端口场景），补充对应测试
- 增强上游错误与敏感信息处理，避免返回/记录不必要的机密细节
- 网关相关 handler/service 多处联动调整，提升异常处理一致性

### 2) 计费与账单链路增强

- 扩展 billing cache 逻辑与按 key 查询能力
- 增加 billing 幂等锁相关能力与测试
- 新增 billing spool service（及测试），提升失败场景下的可恢复性
- pricing service 与相关 repository/service/handler 协同更新

### 3) 管理端模型定价能力

- 新增后端管理接口与服务逻辑：
  - `backend/internal/handler/admin/model_pricing_handler.go`
  - `backend/internal/service/pricing_admin.go`
- 前端新增模型定价页面与 API：
  - `frontend/src/views/admin/ModelPricingView.vue`
  - `frontend/src/api/admin/modelPricing.ts`

### 4) 前端管理台体验优化

- 新增/改造通用组件与组合式逻辑（筛选、批量操作、搜索、导航等）
- 头部、首页、统计卡片、Toast、样式与 Tailwind 配置调整
- 国际化文案（`en` / `zh`）补充与路由更新

### 5) 资产与工程化文件

- 新增 `backend/internal/web/dist-v2/` 构建产物
- 新增 `web-app/`、`web-app-v/` 目录内容（前端工程相关）
- 补充文档与运维脚本（例如 `docs/API_REFERENCE.md`、`deploy/docker_status.ps1`）

---

## 变更规模（概览）

- 1 个提交：`b3f915b`
- 约 `414` 个文件变更
- 约 `+46122 / -431`

> 说明：本次包含较多新增目录与构建产物，请 reviewer 按“核心逻辑文件优先”进行审阅。

---

## 重点审阅建议

请优先关注以下区域：

- 网关请求处理链路与上游转发策略
- 计费幂等、缓存与补偿（spool）相关逻辑
- 管理端模型定价 API 合约与前后端字段一致性
- 安全相关限制（读取上限、URL allowlist/validator）是否符合预期

---

## 验证结果

已在本地完成以下检查并通过：

- 后端测试：`go test ./...`（`backend/`）
- 后端静态检查：`go vet ./...`（`backend/`）
- 前端构建：`pnpm run build`（`frontend/`）
- 前端 lint：`pnpm run lint:check`（`frontend/`）

补充说明：

- `git diff --check` 检出若干前端文件存在 trailing whitespace，不影响构建与测试结果，可后续单独整理。

---

## 风险与回滚

### 风险点

- 网关与计费链路改动面较大，建议关注高并发与异常请求场景
- 管理端模型定价为新增能力，需确认与现网配置/权限模型兼容
- 构建产物与新增子工程目录体量较大，需确认仓库收敛策略

### 回滚方案

- 如出现回归，可先回滚到提交 `8caf76f`
- 或按模块回滚：优先回退网关/计费关键文件后再逐步恢复

---

## 合并前检查清单

- [x] 本地后端测试通过
- [x] 本地前端构建通过
- [x] 本地前端 lint 检查通过
- [ ] Reviewer 完成网关与计费链路重点审阅
- [ ] 确认 `dist-v2` / `web-app*` 目录纳入仓库策略

