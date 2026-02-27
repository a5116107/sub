# COMP-020: CI gate for multi-frontend contract audit

> Status: ✅ Verified (2026-02-09)  
> Verify: `python tools/audit_api_contracts.py --strict`; `python tools/audit_api_contracts.py --include-mocks --strict`  
> Source: `docs/project/FRONTEND_BACKEND_ALIGNMENT_SSOT.md`

## Background

契约审计脚本已具备本地可复跑能力，但若未接入 CI，仍可能在后续 PR 中回归出“前端调用先变、后端契约未跟上”的问题。

## Goal

把契约审计接入仓库默认 CI 流程，作为 PR 必经门禁。

## Scope

- 更新 `.github/workflows/backend-ci.yml`：
  - 新增 `web-app` 构建任务
  - 新增 `contract-audit` 任务（runtime + include-mocks）

## Acceptance

- PR 触发 `backend-ci` 时，自动执行契约审计。
- 任一 mismatch 出现时，CI 直接失败。
- `web-app` 构建纳入常规 CI，避免“仅本地可用”。

## Verify

- `python tools/audit_api_contracts.py --strict`
- `python tools/audit_api_contracts.py --include-mocks --strict`

## Dependency

- `COMP-018`
