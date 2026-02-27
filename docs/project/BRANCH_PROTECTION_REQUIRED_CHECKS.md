# Branch Protection Required Checks (Main)

> Last Updated: 2026-02-09  
> Scope: GitHub branch protection for `main`  
> Goal: 防止前后端契约回归，保证多前端 + 后端 CI 门禁生效

## 1) Recommended Branch Protection Policy

在 GitHub 仓库设置中，对 `main` 分支启用：

- Require a pull request before merging
- Require approvals（建议至少 1）
- Dismiss stale pull request approvals when new commits are pushed
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Do not allow bypassing the above settings（仅管理员例外时按团队策略）

## 2) Required Status Checks (Minimum Baseline)

在 “Require status checks to pass” 中，勾选以下检查：

- `CI / test`
- `CI / golangci-lint`
- `CI / frontend`
- `CI / frontend-v2`
- `CI / web-app`
- `CI / contract-audit`

说明：

- `CI / contract-audit` 已包含：
  - runtime frontends contract audit
  - include mocks contract audit
- 任何 mismatch 都会使该 job 失败，从而阻止合并。

## 3) Optional Strict Checks

如果希望更严格，可额外设置为 required：

- `CI / rate-limiter-integration`

备注：该检查依赖 Docker/testcontainers，通常在 GitHub hosted runner 可运行。

## 4) Verification Checklist (After Config)

- 新建 PR，确认上述 required checks 全部触发。
- 人为提交一条错误 API 路径（测试分支），确认 `CI / contract-audit` 失败。
- 修复后再次推送，确认所有 checks 通过后方可 merge。

## 5) Source of Truth References

- Workflow: `.github/workflows/backend-ci.yml`
- Contract script: `tools/audit_api_contracts.py`
- Alignment SSOT: `docs/project/FRONTEND_BACKEND_ALIGNMENT_SSOT.md`
- Apply runbook: `docs/project/BRANCH_PROTECTION_APPLY_RUNBOOK.md`
