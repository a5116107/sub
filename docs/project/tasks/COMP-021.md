# COMP-021: apply GitHub branch protection required checks for contract gate

> Status: Pending (2026-02-09)  
> Source: `docs/project/FRONTEND_BACKEND_ALIGNMENT_SSOT.md`

## Background

`contract-audit` 已接入 CI，但若主分支未将其设为 required check，仍可能被绕过（例如只看部分 job 绿灯即合并）。

## Goal

将 `main` 分支保护规则配置为“必须通过契约门禁 + 前后端核心 CI”后才能合并。

## Scope

- 在 GitHub 仓库设置中更新 `main` 分支保护
- 勾选 required checks（见清单）
- 完成一次 PR 演练确认规则生效
- 参考执行 runbook：
  - `docs/project/BRANCH_PROTECTION_APPLY_RUNBOOK.md`

## Acceptance

- `main` 分支已启用 required status checks。
- `CI / contract-audit` 在 branch protection 中被设置为 required。
- 一次模拟错误路径 PR 可被门禁拦截，修复后可通过。

## Verify

- 参考执行清单：`docs/project/BRANCH_PROTECTION_REQUIRED_CHECKS.md`
- 参考实施步骤：`docs/project/BRANCH_PROTECTION_APPLY_RUNBOOK.md`
- 在 GitHub UI 复核 Required checks 列表截图/记录

## Dependency

- `COMP-020`
