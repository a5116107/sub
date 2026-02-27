# COMP-017: web-app-v mock handlers contract sync (non-runtime)

> Status: ✅ Verified (2026-02-09)  
> Verify: `pnpm -C web-app-v build`; `python tools/audit_api_contracts.py --include-mocks --strict`  
> Source: `docs/project/FRONTEND_BACKEND_ALIGNMENT_SSOT.md`

## Background

`web-app-v/src/mocks/handlers.ts` 仍保留多条历史接口（如 `/api/v1/user/api-keys`、`/api/v1/user/redeem` 等），与后端真实路由存在偏差。虽然不影响直连后端运行，但会污染本地 mock 联调结论。

## Goal

使 `web-app-v` mock 层与当前后端契约一致，避免“mock 可用、真实后端不可用”的错觉。

## Scope

- 更新 `web-app-v/src/mocks/handlers.ts`
  - 修正路径前缀与资源命名（如 `keys`、`redeem`、`subscriptions`）
  - 移除后端不存在的接口（如 `status/role` 类虚拟路由）
  - 补齐后端已有但 mock 未覆盖的关键路由（仅与当前页面功能相关）

## Acceptance

- mock 路由集合与后端路由命名体系一致。
- 不再存在明显错链接口（用户侧 `user/*` 旧前缀等）。

## Verify

- `pnpm -C web-app-v build`
- 本地 mock 模式下关键页面可正常联调

## Dependency

- `COMP-014`
