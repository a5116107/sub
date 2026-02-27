# COMP-018: add multi-frontend contract regression audit workflow

> Status: ✅ Verified (2026-02-09)  
> Verify: `python tools/audit_api_contracts.py --strict`; `python tools/audit_api_contracts.py --include-mocks --strict`  
> Source: `docs/project/FRONTEND_BACKEND_ALIGNMENT_SSOT.md`

## Background

本次发现的偏差主要来自“前端调用演进快于后端契约同步”，缺少常态化回归检查。

## Goal

把“后端路由 vs 多前端调用”对齐检查固化为可重复执行的流程，作为发布前 gate。

## Scope

- 将本次审计逻辑沉淀为仓库脚本（建议放在 `tools/`）
- 输出统一结果文件（延续 `.context-snapshots/api_alignment_audit.json`）
- 在文档中记录执行方式与判定标准（0 mismatch 才可放行）

## Acceptance

- 任意人可通过单条命令复跑契约审计。
- 结果包含按前端分组的 mismatch 清单与计数。
- 文档明确“哪些目录计入 runtime，哪些属于 mock/test”。

## Verify

- 运行审计命令并生成最新审计文件
- 抽查 3 条已知路径确保匹配规则正确（含动态参数）

## Dependency

- `COMP-014`
- `COMP-015`
- `COMP-016`
