# COMP-014: web-app admin API contract alignment (routes + methods)

> Status: ✅ Verified (2026-02-09)  
> Verify: `pnpm -C web-app build`; `python tools/audit_api_contracts.py --strict`  
> Source: `docs/project/FRONTEND_BACKEND_ALIGNMENT_SSOT.md`

## Background

`web-app` 管理端存在与后端不对齐调用：

- `GET/POST /admin/ops/usage/cleanup-tasks*`（后端实际为 `/admin/usage/cleanup-tasks*`）
- `GET /admin/user-attributes/:id`（后端不存在该 GET）

## Goal

在不改后端契约前提下，修复 `web-app` 管理侧 API 调用层不对齐问题。

## Scope

- 修改 `web-app/src/entities/admin/api/index.ts`：
  - cleanup tasks 路径改为 `/admin/usage/cleanup-tasks*`
  - 移除或替换 `GET /admin/user-attributes/:id` 的调用能力（改为可用接口组合）
- 检查所有调用方，确保不会再触发不存在的 GET 接口。

## Acceptance

- 不再出现以下 runtime 请求：
  - `/api/v1/admin/ops/usage/cleanup-tasks`
  - `GET /api/v1/admin/user-attributes/:id`
- 清理任务相关接口可正常调用后端现有接口：
  - `GET /api/v1/admin/usage/cleanup-tasks`
  - `POST /api/v1/admin/usage/cleanup-tasks`
  - `POST /api/v1/admin/usage/cleanup-tasks/:id/cancel`

## Verify

- `pnpm -C web-app build`
- 运行契约审计脚本并确认上述 mismatch 清零

## Dependency

- None
