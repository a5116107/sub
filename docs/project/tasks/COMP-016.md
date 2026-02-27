# COMP-016: web-app auth/payment contract alignment (logout + cancel order)

> Status: ✅ Verified (2026-02-09)  
> Verify: `pnpm -C web-app build`; `python tools/audit_api_contracts.py --strict`  
> Source: `docs/project/FRONTEND_BACKEND_ALIGNMENT_SSOT.md`

## Background

`web-app` 当前调用了后端不存在接口：

- `POST /auth/logout`
- `POST /payments/orders/:id/cancel`

后端现有能力：

- 鉴权侧无 `logout` endpoint（前端应本地清理会话）
- 支付侧仅有 `POST /payments/orders` 与 `GET /payments/orders/:id`

## Goal

移除对不存在后端能力的依赖，保证页面行为与后端实际能力一致。

## Scope

- 修改 `web-app/src/entities/auth/api/index.ts`
  - `logout` 改为本地会话清理，不再请求不存在路由
- 修改 `web-app/src/entities/payment/api/index.ts`
  - 移除/禁用订单取消 API 调用与入口，或重定向为已支持的订单查询流程
- 检查调用方，确保不再触发 404。

## Acceptance

- 不再发起以下请求：
  - `POST /api/v1/auth/logout`
  - `POST /api/v1/payments/orders/:id/cancel`
- 登出后会话状态正确重置并跳转预期页面。
- 支付页面不再暴露无法执行的“取消订单”操作。

## Verify

- `pnpm -C web-app build`
- 手工验证：登出流程、支付订单详情流程
- 契约审计报告中上述 2 项 mismatch 清零

## Dependency

- `COMP-014`
