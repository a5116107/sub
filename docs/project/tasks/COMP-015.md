# COMP-015: web-app announcements contract alignment (user-side capabilities)

> Status: ✅ Verified (2026-02-09)  
> Verify: `pnpm -C web-app build`; `python tools/audit_api_contracts.py --strict`  
> Source: `docs/project/FRONTEND_BACKEND_ALIGNMENT_SSOT.md`

## Background

`web-app` 用户公告模块调用了后端不存在接口：

- `GET /announcements/:id`
- `POST /announcements/read-all`
- `GET /announcements/unread-count`

后端用户侧目前仅提供：

- `GET /announcements`
- `POST /announcements/:id/read`

## Goal

把用户公告交互收敛到后端已提供能力，避免 404 与虚假功能入口。

## Scope

- 修改 `web-app/src/entities/announcement/api/index.ts`
- 调整相关页面/组件行为：
  - 单条详情改为从列表数据进入或取消独立请求
  - “全部已读”与“未读计数”改为前端可计算策略或隐藏入口

## Acceptance

- 不再发起以下请求：
  - `GET /api/v1/announcements/:id`
  - `POST /api/v1/announcements/read-all`
  - `GET /api/v1/announcements/unread-count`
- 公告列表与单条已读流程保持可用。

## Verify

- `pnpm -C web-app build`
- 公告页面手工验证：列表加载 + 单条已读成功
- 契约审计报告中上述 3 项 mismatch 清零

## Dependency

- `COMP-014`
