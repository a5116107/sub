# Frontend-Backend Contract Alignment SSOT

> Date: 2026-02-09  
> Owner: Frontend + Backend Integration  
> Baseline Rule: 以后端接口契约为唯一基准（path/method/params/response）

## 1) Scope

- Frontends in scope:
  - `frontend`
  - `web-app-v`
  - `web-app`
  - `new`（仅检查是否调用本后端 REST API）
- Backend contract baseline:
  - `backend/internal/server/routes/common.go`
  - `backend/internal/server/routes/auth.go`
  - `backend/internal/server/routes/user.go`
  - `backend/internal/server/routes/payment.go`
  - `backend/internal/server/routes/admin.go`
  - `backend/internal/server/routes/gateway.go`
  - `backend/internal/setup/handler.go`

## 2) Audit Snapshot (Current)

- Runtime API contract mismatch:
  - `frontend`: 0
  - `web-app-v`: 0
  - `web-app`: 9
  - `new`: 0（未发现本后端 REST API 调用）
- Evidence artifact:
  - `.context-snapshots/api_alignment_audit.json`

## 3) Solution Options (A/B/C)

- A) 纯前端收敛到后端契约（推荐）
  - Pros: 风险最小，符合“后端为基准”，改动集中在前端调用层
  - Cons: 需要调整部分前端交互预期
- B) 后端新增兼容接口以匹配前端现状
  - Pros: 前端改动少
  - Cons: 扩大后端维护面，长期增加契约债务
- C) 双向折中（部分前端改 + 部分后端兼容）
  - Pros: 迁移可平滑
  - Cons: 责任边界不清晰，后续回收成本高

Decision: 选择 A（后端契约不退让，前端一次性对齐）。

## 4) One-shot Task Package (SSOT)

| ID | Task | Priority | Dependency |
|---|---|---|---|
| COMP-014 | `web-app` 管理侧 API 路径/方法对齐 | P1 | - |
| COMP-015 | `web-app` 用户公告 API 能力对齐 | P1 | COMP-014 |
| COMP-016 | `web-app` 鉴权与支付 API 能力对齐 | P1 | COMP-014 |
| COMP-017 | `web-app-v` mock 契约同步后端 | P2 | COMP-014 |
| COMP-018 | 多前端契约回归检查脚本化 | P2 | COMP-014, COMP-015, COMP-016 |
| COMP-019 | 多前端回归验证与 SSOT 收口 | P1 | COMP-015, COMP-016, COMP-017, COMP-018 |

## 5) Global Acceptance

- 所有运行时前端调用必须与后端路由对齐：
  - method 一致
  - path 一致（含动态参数位置）
  - 查询参数/请求体字段按后端 handler 实际读取字段对齐
- `web-app` 当前 9 项 mismatch 全部清零。
- 交付后生成新的审计结果并保留证据文件。

## 6) Global Verify Entry

- Backend:
  - `go test ./...`（在 `backend` 目录）
- Frontends:
  - `pnpm -C frontend test:run`
  - `pnpm -C frontend build`
  - `pnpm -C web-app build`
  - `pnpm -C web-app-v build`
- Contract audit rerun:
  - `python tools/audit_api_contracts.py --strict`
  - （可选）`python tools/audit_api_contracts.py --include-mocks`

## 7) Stop Conditions

- 若某项前端功能依赖后端当前不存在的能力，必须先在任务内显式改为“降级/隐藏/重定向到已有能力”，不得私自扩展后端契约。
- 若发现新增 mismatch，不允许继续推进到 `COMP-019`，必须先回到对应子任务修正。

## 8) CI Gate

- 已接入 `backend-ci` 工作流门禁：
  - `web-app` 构建校验
  - `contract-audit`（runtime）
  - `contract-audit`（include mocks）
- CI 文件：`.github/workflows/backend-ci.yml`

## 9) Branch Protection

- 主分支 required checks 配置清单：
  - `docs/project/BRANCH_PROTECTION_REQUIRED_CHECKS.md`
- 主分支实际操作 runbook：
  - `docs/project/BRANCH_PROTECTION_APPLY_RUNBOOK.md`
