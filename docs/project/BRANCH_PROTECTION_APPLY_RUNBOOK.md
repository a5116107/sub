# Branch Protection Apply Runbook (Main)

> Last Updated: 2026-02-09  
> Target Repo: `Wei-Shaw/sub2api`  
> Target Branch: `main`

## 1) Preconditions

- 你需要该仓库的管理员权限（`Admin`）。
- 先确保最近一次 CI 已跑出以下检查名称（用于可选项勾选）：
  - `CI / test`
  - `CI / golangci-lint`
  - `CI / frontend`
  - `CI / frontend-v2`
  - `CI / web-app`
  - `CI / contract-audit`

## 2) GitHub UI 操作路径（推荐）

1. 打开仓库 `https://github.com/Wei-Shaw/sub2api`
2. 进入 `Settings` -> `Branches`
3. 在 `Branch protection rules` 点击 `Add rule`
4. `Branch name pattern` 填：`main`
5. 勾选：
   - `Require a pull request before merging`
   - `Require approvals`（建议 1）
   - `Dismiss stale pull request approvals when new commits are pushed`
   - `Require status checks to pass before merging`
   - `Require branches to be up to date before merging`
6. 在 `Status checks that are required` 中添加：
   - `CI / test`
   - `CI / golangci-lint`
   - `CI / frontend`
   - `CI / frontend-v2`
   - `CI / web-app`
   - `CI / contract-audit`
7. 点击 `Create` / `Save changes`

## 3) 验收步骤（建议）

1. 提交一个测试 PR（可改文档）
2. 确认以上 required checks 全部触发并通过
3. 在测试分支故意引入一条错误 API 路径，再推送
4. 确认 `CI / contract-audit` 失败并阻止合并
5. 修复后再次推送，确认恢复通过

## 4) API 方式（可选，自动化）

如果你想脚本化，可用 GitHub REST API 更新分支保护。  
需要 `GITHUB_TOKEN` 具备 `repo` + `admin:repo_hook`（或等效管理权限）。

```bash
curl -L \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer ${GITHUB_TOKEN}" \
  https://api.github.com/repos/Wei-Shaw/sub2api/branches/main/protection \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": [
        "CI / test",
        "CI / golangci-lint",
        "CI / frontend",
        "CI / frontend-v2",
        "CI / web-app",
        "CI / contract-audit"
      ]
    },
    "enforce_admins": false,
    "required_pull_request_reviews": {
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": false,
      "required_approving_review_count": 1
    },
    "restrictions": null
  }'
```

## 5) Evidence Record Template

建议在执行后，把以下内容记录到任务评论或变更记录：

- 配置时间（UTC）
- 执行人
- 生效仓库/分支
- required checks 最终列表（截图或文字）
- 一次“故意失败 -> 修复通过”的验证结果

## 6) Related SSOT

- `docs/project/BRANCH_PROTECTION_REQUIRED_CHECKS.md`
- `docs/project/FRONTEND_BACKEND_ALIGNMENT_SSOT.md`
- `docs/project/tasks/COMP-021.md`
