# Upstream Gap SSOT (2026-02-10)

## Baseline

- Repo: `sub2api-upsync`
- Branch: `sync/reimpl-upstream-v0.1.72-b1`
- Divergence (`HEAD...origin/main`): `ahead 173 / behind 248` (cherry-pick aware right-only non-merge backlog ~= 187 commits)
- Latest tag:
  - local reachable: `v0.1.65`
  - upstream: `v0.1.77`
- Missing upstream tags: `v0.1.66`, `v0.1.69`, `v0.1.70`, `v0.1.71`, `v0.1.72`, `v0.1.73`, `v0.1.74`, `v0.1.75`, `v0.1.77`

## Planning Principles (No-Regression)

1. Preserve fork-specific capabilities first; do not do destructive full-merge.
2. Use feature-equivalence reimplementation with compatibility shims.
3. Prioritize runtime behavior parity (P0) over UI parity (P2).
4. Each batch must be verifiable via backend + frontend commands.
5. Keep `.tmp_*` workspace files untouched.

## Gap Inventory -> SSOT Tasks

| Category | Gap Summary | Representative Upstream Commits | Risk | SSOT Task |
|---|---|---|---|---|
| Runtime failover behavior | Missing linear switch delay and sticky failover cache-billing exemption chain | `681950da`, `72b08f9c` | P0 | `UPSYNC-002` |
| Error policy sequencing | Ensure policy check precedes retry and final handling is policy-consistent | `a70d37a6`, `a67d9337`, `6892e84a`, `73f45574` | P0 | `UPSYNC-003` |
| Model-level rate-limit governance | Admin clear/reset flow + DTO/UI visibility for model-level rate limits | `fc095bf0`, `4a84ca9a` | P1 | `UPSYNC-004` |
| CRS sync UX/functionality | Preview + selectable account sync flow | `5e0d7894`, `04cedce9` | P1 | `UPSYNC-005` |
| Upstream forwarding parity | Residual passthrough/routing edges and regression-proofing | `9236936a`, `1563bd3d`, `6ab77f5e`, `4f57d7f7` | P1 | `UPSYNC-006` |
| Claude/OAuth compat residuals | Beta/header/session/fingerprint/mimic edge consistency | `0c011b88`, `2a7d04fe`, `9a48b2e9`, `d182ef03` | P1 | `UPSYNC-007` |
| Scheduler/failover consistency | Retry budget/cooldown/load-aware fairness closure | `1af06aed`, `3077fd27`, `12515246` | P1 | `UPSYNC-008` |
| Admin/UI parity pack | Group sorting, toolbar unification, badge props, OAuth batch RT workflows | `bac9e2bf`, `b1c30df8`, `470b37be`, `8a0a8558` | P2 | `UPSYNC-009` |
| Session store technical debt | Trie-based digest session store replacement with flat cache | `b889d501` | P2 | `UPSYNC-010` |
| Closure governance | Tag-gap closure report, residual-diff triage, release readiness | `51572b5d`, `3c936441`, `aa4b1021` | P2 | `UPSYNC-011` |

## Not Planned for Direct Port (Intentional Divergence)

- Pure version/chore commits with no runtime impact.
- Non-critical style-only commits when local equivalent behavior already exists.
- Upstream changes that conflict with fork-required custom capabilities (must be reimplemented as compatible alternatives).

## Execution Order

1. `UPSYNC-001` (baseline lock and evidence refresh)
2. `UPSYNC-002` + `UPSYNC-003` (P0 runtime parity)
3. `UPSYNC-004` + `UPSYNC-005` + `UPSYNC-006` + `UPSYNC-007` + `UPSYNC-008` (P1 core parity)
4. `UPSYNC-009` + `UPSYNC-010` + `UPSYNC-011` (P2 parity/tech-debt/closure)

## Standard Verification Pack (Every Batch)

- `go test ./internal/service/...`
- `go test ./...`
- `pnpm -C frontend typecheck`

