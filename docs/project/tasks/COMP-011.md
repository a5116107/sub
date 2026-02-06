# COMP-011: Admin: Dashboard aggregation backfill UI wiring

> Status: ✅ Verified (2026-01-30)
> 验证：`pnpm -C frontend test:run`、`pnpm -C frontend build`

## 背景/问题

Dashboard 预聚合统计需要支持手工触发回填，以补齐历史窗口数据（或排查聚合缺口）。

后端提供：

- `POST /api/v1/admin/dashboard/aggregation/backfill`

## 现状（已实现）

- 前端 API：`frontend/src/api/admin/dashboard.ts#backfillAggregation`
- 前端 UI：`frontend/src/views/admin/DashboardView.vue` 已提供回填弹窗入口与时间范围校验

## 验收标准

- 支持输入 start/end 时间范围并触发回填请求（后端一般返回 accepted/ok）
- UI 对时间范围做基础校验（空值、顺序、最大天数等），并给出错误提示
- 触发成功给出提示，不影响 Dashboard 其他轮询/展示

## 验证建议

- `pnpm -C frontend test:run`
- `pnpm -C frontend build`

