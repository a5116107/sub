# COMP-010: Admin: Gemini Google One tier refresh UI wiring

> Status: ✅ Verified (2026-01-30)
> 验证：`pnpm -C frontend test:run`、`pnpm -C frontend build`

## 背景/问题

Gemini OAuth（Google One）账号在使用过程中可能需要刷新 tier/storage 信息。后端提供：

- `POST /api/v1/admin/accounts/:id/refresh-tier`
- `POST /api/v1/admin/accounts/batch-refresh-tier`

## 现状（已实现）

- 前端 API：`frontend/src/api/admin/accounts.ts`
  - `refreshTier(id)`
  - `batchRefreshTier(accountIds?)`
- 前端 UI：Accounts 页面已存在对应入口（单个与批量）。

## 验收标准

- 单个刷新：对 Gemini OAuth（Google One）账号调用后端刷新接口成功返回快照数据
- 批量刷新：支持选择账号列表或不传 `account_ids` 让后端刷新全部 eligible 账号，并对失败项给出错误列表
- UI 在请求中有 loading/错误提示，不阻塞其他功能

## 验证建议

- `pnpm -C frontend test:run`
- `pnpm -C frontend build`

