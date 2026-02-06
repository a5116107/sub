# Task Tracker

> **Last Updated**: 2026-02-03
> **Last Updated**: 2026-02-03
> **Active**: 0 | **Pending**: 3 | **Completed This Week**: 21

---

## Current Sprint

| ID | Task | Priority | Status | Owner | Start Date | Source |
|----|------|----------|--------|-------|------------|--------|
| SEC-045 | Security/SSRF: provider-specific upstream allowlists | P2 | Completed |  | 2026-02-03 | `docs/project/tasks/SEC-045.md` |
| SEC-044 | Security/SSRF: enforce URL allowlist for iFlow/Qwen base_url | P1 | Completed |  | 2026-02-03 | `docs/project/tasks/SEC-044.md` |
| SEC-043 | Security/SSRF: restrict base_url ports and paths | P2 | Completed |  | 2026-02-03 | `docs/project/tasks/SEC-043.md` |
| SEC-042 | Security/SSRF: default allow_private_hosts to false | P1 | Completed |  | 2026-02-03 | `docs/project/tasks/SEC-042.md` |
| SEC-041 | Security: default allow_insecure_http to false | P1 | Completed |  | 2026-02-03 | `docs/project/tasks/SEC-041.md` |
| SEC-040 | Security/SSRF: make URL allowlist enforcement default-on | P1 | Completed |  | 2026-02-03 | `docs/project/tasks/SEC-040.md` |
| SEC-039 | Privacy: eliminate fmt.Printf logging in OAuth flows | P1 | Completed |  | 2026-02-03 | `docs/project/tasks/SEC-039.md` |
| SEC-038 | Security: remove hardcoded OAuth client secrets (Gemini CLI/Antigravity) | P1 | Completed |  | 2026-02-03 | `docs/project/tasks/SEC-038.md` |
| BILL-018 | Billing: default pricing missing policy must not undercharge unknown models | P1 | Completed |  | 2026-02-03 | `docs/project/tasks/BILL-018.md` |
| SEC-037 | Security/DoS: apply RequestBodyLimit to /api/v1 and return 413 for webhooks | P1 | Completed |  | 2026-02-03 | `docs/project/tasks/SEC-037.md` |
| SEC-035 | Security/DoS: cap remaining external HTTP response bodies | P1 | Completed |  | 2026-02-03 | `docs/project/tasks/SEC-035.md` |
| SEC-034 | Security/DoS: cap upstream non-streaming response bodies in gateway services | P1 | Completed |  | 2026-02-03 | `docs/project/tasks/SEC-034.md` |
| SEC-033 | Security/DoS: cap remote HTTP response bodies (pricing/hash/checksum) | P1 | Completed |  | 2026-02-03 | `docs/project/tasks/SEC-033.md` |
| SEC-032 | Security/DoS: opencode instructions fetch must have timeout and size limit | P1 | Completed |  | 2026-02-03 | `docs/project/tasks/SEC-032.md` |
| SEC-031 | Security/DoS: proxy probe should avoid plaintext HTTP and cap response body | P2 | Completed |  | 2026-02-03 | `docs/project/tasks/SEC-031.md` |
| BILL-017 | Billing: avoid subscription cache double-count on reservation finalize | P1 | Completed |  | 2026-02-03 | `docs/project/tasks/BILL-017.md` |
| BILL-016 | Billing: durable ledger when usage log write fails (infra outage) | P1 | Completed |  | 2026-02-03 | `docs/project/tasks/BILL-016.md` |
| BILL-015 | Billing: pricing missing must not bill as $0 | P1 | Completed |  | 2026-02-02 | `docs/project/tasks/BILL-015.md` |
| BILL-014 | Billing: close usage log insert bypass + fix idempotency undercharge | P1 | Completed |  | 2026-02-02 | `docs/project/tasks/BILL-014.md` |
| SEC-030 | XSS: harden public HomeContent rendering (v-html) | P2 | Completed |  | 2026-02-02 | `docs/project/tasks/SEC-030.md` |
| SEC-029 | Privacy: redact OAuth exchange logs (email/org/account uuid) | P2 | Completed |  | 2026-02-02 | `docs/project/tasks/SEC-029.md` |
| SUB-007 | User: subscription single progress endpoint + contract alignment | P1 | Completed |  | 2026-01-30 | `docs/project/tasks/SUB-007.md` |
| SUB-006 | Admin: feature toggles for subscriptions/pricing | P2 | Completed |  | 2026-01-27 | `docs/project/tasks/SUB-006.md` |
| SEC-028 | Security: scope sticky session keys per-user (avoid cross-user pinning) | P2 | Completed |  | 2026-01-27 | `docs/project/tasks/SEC-028.md` |
| SEC-027 | Security: admin API key cannot update/rollback/restart system | P1 | Completed |  | 2026-01-27 | `docs/project/tasks/SEC-027.md` |
| SEC-026 | APIKey: subscription group auth must not be blocked by AllowedGroups | P1 | Completed |  | 2026-01-27 | `docs/project/tasks/SEC-026.md` |
| SEC-025 | Security: admin API key management requires JWT (permission boundary) | P2 | Completed |  | 2026-01-27 | `docs/project/tasks/SEC-025.md` |
| BILL-013 | Billing: reconcile path must also apply referral commission | P2 | Completed |  | 2026-01-27 | `docs/project/tasks/BILL-013.md` |
| BILL-008 | Billing: ledger entry can get stuck unapplied (idempotency gap) | P1 | Completed |  | 2026-01-27 | `docs/project/tasks/BILL-008.md` |
| BILL-009 | Billing: referral invite binding + bonuses should be atomic | P2 | Completed |  | 2026-01-27 | `docs/project/tasks/BILL-009.md` |
| BUG-005 | Redeem: code lookup should be tolerant to case/whitespace | P3 | Completed |  | 2026-01-27 | `docs/project/tasks/BUG-005.md` |
| COMP-004 | Provider: Qwen support (OAuth + gateway) | P1 | Completed |  | 2026-01-26 | `docs/project/tasks/COMP-004.md` |
| COMP-005 | Provider: iFlow support (gateway + credential onboarding) | P1 | Completed |  | 2026-01-26 | `docs/project/tasks/COMP-005.md` |
| COMP-006 | Gateway: Generic payload rules engine (safe subset) | P2 | Completed |  | 2026-01-26 | `docs/project/tasks/COMP-006.md` |
| COMP-007 | Compliance spike: "cloak/compat mode" scope review; implement safe subset only (no obfuscation) | P3 | Completed |  | 2026-01-26 | `docs/project/tasks/COMP-007.md` |
| COMP-008 | Amp provider aliases: add /api/provider/google + root-level openai/anthropic aliases | P3 | Completed |  | 2026-01-26 | `docs/project/tasks/COMP-008.md` |
| COMP-009 | Amp Google v1beta1 bridge: /api/provider/google/v1beta1/*path -> local Gemini handlers | P3 | Completed |  | 2026-01-26 | `docs/project/tasks/COMP-009.md` |
| SDK-001 | SDK: Public Go client SDK (gateway+admin) | P3 | Completed |  | 2026-01-26 | `docs/project/tasks/SDK-001.md` |
| COMP-001 | Gateway: OpenAI `POST /v1/chat/completions` + `POST /v1/completions` compatibility | P1 | Completed |  | 2026-01-26 | `docs/project/tasks/COMP-001.md` |
| COMP-002 | Gateway: Gemini CLI `POST /v1internal:{method}` allowlist + SSE | P1 | Completed |  | 2026-01-26 | `docs/project/tasks/COMP-002.md` |
| COMP-003 | Gateway: Amp CLI route aliases `/api/provider/{provider}/v1...` + model mapping (MVP) | P1 | Completed |  | 2026-01-26 | `docs/project/tasks/COMP-003.md` |


---

## Backlog Pool

### P1 - High Priority (This Cycle)

| ID | Task | Source Document | Created |
|----|------|-----------------|---------|

### P2 - Medium Priority (Next Cycle)

| ID | Task | Source Document | Created |
|----|------|-----------------|---------|
| COMP-010 | Admin: Gemini Google One tier refresh UI wiring | `docs/project/tasks/COMP-010.md` | 2026-01-30 |
| COMP-011 | Admin: Dashboard aggregation backfill UI wiring | `docs/project/tasks/COMP-011.md` | 2026-01-30 |
| COMP-012 | Admin: Qwen OAuth poll + refresh UI wiring | `docs/project/tasks/COMP-012.md` | 2026-01-30 |
| COMP-013 | Admin: OpenAI OAuth refresh helpers UI wiring | `docs/project/tasks/COMP-013.md` | 2026-01-30 |



### P3 - Low Priority (Planning)

| ID | Task | Source Document | Created |
|----|------|-----------------|---------|


---

## Completed (Last 20)

| ID | Task | Completed | Verified |
|----|------|-----------|----------|
| BILL-018 | Billing: default pricing missing policy must not undercharge unknown models | 2026-02-03 | `cd backend; go test ./...` PASS |
| SEC-037 | Security/DoS: apply RequestBodyLimit to /api/v1 and return 413 for webhooks | 2026-02-03 | `cd backend; go test ./...` PASS |
| SEC-035 | Security/DoS: cap remaining external HTTP response bodies | 2026-02-03 | `cd backend; go test ./...` PASS |
| SEC-034 | Security/DoS: cap upstream non-streaming response bodies in gateway services | 2026-02-03 | `cd backend; go test ./...` PASS |
| SEC-033 | Security/DoS: cap remote HTTP response bodies (pricing/hash/checksum) | 2026-02-03 | `cd backend; go test ./...` PASS |
| SEC-032 | Security/DoS: opencode instructions fetch must have timeout and size limit | 2026-02-03 | `cd backend; go test ./...` PASS; `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| SEC-031 | Security/DoS: proxy probe should avoid plaintext HTTP and cap response body | 2026-02-03 | `cd backend; go test ./...` PASS |
| BILL-017 | Billing: avoid subscription cache double-count on reservation finalize | 2026-02-03 | `cd backend; go test ./...` PASS |
| BILL-016 | Billing: durable ledger when usage log write fails (infra outage) | 2026-02-03 | `cd backend; go test ./...` PASS; `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| BILL-015 | Billing: pricing missing must not bill as $0 | 2026-02-02 | `cd backend; go test ./...` PASS |
| BILL-014 | Billing: close usage log insert bypass + fix idempotency undercharge | 2026-02-02 | `cd backend; go test ./...` PASS |
| SEC-030 | XSS: harden public HomeContent rendering (v-html) | 2026-02-02 | `cd backend; go test ./...` PASS; `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| SEC-029 | Privacy: redact OAuth exchange logs (email/org/account uuid) | 2026-02-02 | `cd backend; go test ./...` PASS |
| SUB-007 | User: subscription single progress endpoint + contract alignment | 2026-01-30 | `cd backend; go test ./...` PASS; `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| SUB-006 | Admin: feature toggles for subscriptions/pricing | 2026-01-27 | `cd backend; go test ./...` PASS; `pnpm -C frontend build` PASS |
| SEC-028 | Security: scope sticky session keys per-user (avoid cross-user pinning) | 2026-01-27 | `cd backend; go test ./...` PASS |
| SEC-027 | Security: admin API key cannot update/rollback/restart system | 2026-01-27 | `cd backend; go test ./...` PASS |
| SEC-026 | APIKey: subscription group auth must not be blocked by AllowedGroups | 2026-01-27 | `cd backend; go test ./...` PASS |
| SEC-025 | Security: admin API key management requires JWT (permission boundary) | 2026-01-27 | `cd backend; go test ./...` PASS |
| BILL-013 | Billing: reconcile path must also apply referral commission | 2026-01-27 | `cd backend; go test ./...` PASS |
| BILL-012 | Billing: honor client idempotency key for usage logs | 2026-01-27 | `cd backend; go test ./...` PASS |
| BILL-011 | Billing: referral commission must apply on gateway billing path | 2026-01-27 | `cd backend; go test ./...` PASS |
| SUB-005 | Subscription: reservation must run after payload rules (avoid under-reserve) | 2026-01-27 | `cd backend; go test ./...` PASS |
| SUB-004 | Subscription: reservation estimator should be conservative (single-request punch-through) | 2026-01-27 | `cd backend; go test ./...` PASS |
| BILL-010 | Reconcile unapplied billing ledger entries (safety net) | 2026-01-27 | `cd backend; go test ./...` PASS |
| BILL-008 | Billing: ledger entry can get stuck unapplied (idempotency gap) | 2026-01-27 | `cd backend; go test ./...` PASS |
| BILL-009 | Billing: referral invite binding + bonuses should be atomic | 2026-01-27 | `cd backend; go test ./...` PASS |
| BUG-005 | Redeem: code lookup should be tolerant to case/whitespace | 2026-01-27 | `cd backend; go test ./...` PASS |
| SUB-003 | Subscription: additionalCost precheck superseded by atomic reserve/finalize | 2026-01-27 | `cd backend; go test ./...` PASS |
| AUTH-002 | APIKey: gate Google `?key=` query policy via config | 2026-01-27 | `cd backend; go test ./...` PASS |
| PAY-003 | Payment: define expiry semantics (display) + accept late-paid callbacks | 2026-01-27 | `cd backend; go test ./...` PASS |
| AUTH-001 | APIKey: enforce IP whitelist/blacklist for Google-style auth middleware | 2026-01-27 | `cd backend; go test ./...` PASS |
| PAY-002 | Payment: EPay webhook retries on transient errors | 2026-01-27 | `cd backend; go test ./...` PASS |
| PAY-001 | Payment webhooks: strict currency/amount validation | 2026-01-27 | `cd backend; go test ./...` PASS |
| SUB-002 | Subscription: window start/reset semantics are rolling | 2026-01-27 | `cd backend; go test ./...` PASS |
| SUB-001 | Subscription: atomic reserve/finalize for quota | 2026-01-27 | `cd backend; go test ./...` PASS; `cd backend; go test -tags=integration ./internal/repository -run TestBillingCacheSuite` PASS |
| SEC-022 | Security: stop trusting Host/Origin for reset/OAuth redirect URLs | 2026-01-27 | `cd backend; go test ./...` PASS |
| SEC-021 | Security: remove committed secrets (`deploy/.env`) + rotate | 2026-01-27 | `cd backend; go test ./...` PASS |
| BILL-003 | Billing: apply rate_multiplier to subscription usage (configurable) | 2026-01-27 | `cd backend; go test ./...` PASS |
| BILL-005 | Subscription: window start/reset semantics are rolling (consistent) | 2026-01-27 | `cd backend; go test ./...` PASS |
| BILL-002 | Billing: explicit missing pricing policy (configurable) | 2026-01-27 | `cd backend; go test ./...` PASS |
| BILL-001 | Billing: bill by mapped/billed model; store billed_model | 2026-01-27 | `cd backend; go test ./...` PASS |
| SEC-024 | Security: custom key exists check includes soft-deleted + consistent rate-limit accounting | 2026-01-27 | `cd backend; go test ./...` PASS |
| BILL-006 | Billing/Payments: strict webhook amount/currency + unique provider refs | 2026-01-27 | `cd backend; go test ./...` PASS |
| SEC-023 | Security: enforce AllowedGroups as runtime ACL + group disable revocation | 2026-01-27 | `cd backend; go test ./...` PASS |
| BILL-004 | Billing: subscription quota reservation (race-safe) + cost-aware enforcement | 2026-01-27 | `cd backend; go test ./...` PASS; `cd backend; go test -tags=integration ./internal/repository -run TestBillingCacheSuite` PASS |
| COMP-009 | Amp Google v1beta1 bridge: /api/provider/google/v1beta1/*path -> local Gemini handlers | 2026-01-26 | `cd backend; go test ./...` PASS |
| COMP-008 | Amp provider aliases: add /api/provider/google + root-level openai/anthropic aliases | 2026-01-26 | `cd backend; go test ./...` PASS |
| COMP-007 | Compliance spike: "cloak/compat mode" scope review; implement safe subset only (no obfuscation) | 2026-01-26 | `cd backend; go test ./...` PASS |
| SDK-001 | SDK: Public Go client SDK (gateway+admin) | 2026-01-26 | `cd sdk/go; go test ./...` PASS |
| COMP-006 | Gateway: Generic payload rules engine (safe subset) | 2026-01-26 | `cd backend; go test ./...` PASS |
| COMP-005 | Provider: iFlow support (gateway + credential onboarding) | 2026-01-26 | Backend+Frontend checks PASS (`cd backend; go test ./...`, `pnpm -C frontend lint:check`, `pnpm -C frontend test:run`, `pnpm -C frontend build`) |
| COMP-004 | Provider: Qwen support (OAuth + gateway) | 2026-01-26 | Backend+Frontend checks PASS (`cd backend; go test ./...`, `pnpm -C frontend lint:check`, `pnpm -C frontend test:run`, `pnpm -C frontend build`) |
| COMP-003 | Gateway: Amp CLI route aliases `/api/provider/{provider}/v1...` + model mapping (MVP) | 2026-01-26 | `cd backend; go test ./...` PASS |
| COMP-001 | Gateway: OpenAI `POST /v1/chat/completions` + `POST /v1/completions` compatibility | 2026-01-26 | `cd backend; go test ./...` PASS |
| COMP-002 | Gateway: Gemini CLI `POST /v1internal:{method}` allowlist + SSE | 2026-01-26 | `cd backend; go test ./...` PASS |
| OPS-020 | 网关：默认 cache_control 超限移除策略改为 `messages_tail_then_head`（更利于前缀缓存） | 2026-01-25 | `cd backend; go test ./...` PASS |
| OPS-019 | 网关：代理请求失败时触发账号 failover（间接切换代理，减少单代理故障影响） | 2026-01-25 | `cd backend; go test ./...` PASS |
| DOC-004 | Docs: Cache & Scheduling Playbook（LB vs Sticky / 上游缓存命中率调参 / Redis 前缀隔离 / 条件跳过测试） | 2026-01-25 | Added (`docs/project/CACHE_PLAYBOOK.md`) |
| OBS-001 | 监控：输出上游 prompt cache 命中率（CacheReadTokens/CacheCreationTokens）与趋势（按平台/组/账号） | 2026-01-25 | Backend+Frontend tests PASS (`go test ./...`, `go test -tags=integration ./...`, `pnpm -C frontend lint:check`, `pnpm -C frontend test:run`, `pnpm -C frontend build`) |
| CI-003 | CI：独立 Job 运行 `middleware/rate_limiter_integration_test.go`（不允许 Skip） | 2026-01-25 | Workflow added (`.github/workflows/backend-ci.yml`) |
| CI-002 | CI：workflow_dispatch 运行 `internal/integration/e2e_gateway_test.go`（支持 `E2E_*` 环境变量） | 2026-01-25 | Workflow + env config (`.github/workflows/backend-ci.yml`, `backend/internal/integration/e2e_gateway_test.go`) |
| CI-001 | CI：workflow_dispatch 运行 `tlsfingerprint/dialer_test.go`（网络/集成） | 2026-01-25 | Workflow added (`.github/workflows/backend-ci.yml`) |
| OPS-018 | 后端：Redis 全局 `redis.key_prefix`（含 Pub/Sub channel） | 2026-01-25 | `cd backend; go test ./...` PASS |
| OPS-017 | 后端：`enforceCacheControlLimit` 移除策略可配置（messages_head/messages_tail/混合） | 2026-01-25 | `cd backend; go test ./...` PASS |
| OPS-016 | 后端：sticky session TTL 可配置（`gateway.scheduling.sticky_session_ttl`） | 2026-01-25 | `cd backend; go test ./...` PASS |
| DOC-003 | SSOT: track `docs/project` in git (`.gitignore` unignore rules) | 2026-01-24 | `git status --porcelain docs/project/TASK_TRACKER.md docs/project/CHANGELOG.md` shows files not ignored |
| UI-020 | 前端：Admin Usage UsageFilters 主/高级字段按频率重排（高级筛选可折叠 + 激活计数提示） | 2026-01-24 | `pnpm -C frontend lint:check` PASS; `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| UI-021 | 前端：Admin Usage 图表区可折叠（状态持久化）+ logs/stats/charts 支持 AbortSignal 取消并忽略取消误报 | 2026-01-24 | `pnpm -C frontend lint:check` PASS; `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| UI-019 | 前端：Admin Usage 已启用筛选 chips（单项清除/清除全部）+ 筛选 presets（最近/收藏） | 2026-01-24 | `pnpm -C frontend lint:check` PASS; `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| UI-018 | 前端：Admin Usage 重构为 Overview/Logs tabs + TablePageLayout（固定工具栏/表格内滚动/Tab 状态记忆） | 2026-01-24 | `pnpm -C frontend lint:check` PASS; `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| OPS-013 | 后端：补齐代理连通性测试（ProxyService.TestConnection） | 2026-01-24 | `cd backend; go test ./...` PASS |
| OPS-011 | 后端：补齐账号凭证刷新（AdminService.RefreshAccountCredentials） | 2026-01-24 | `cd backend; go test ./...` PASS |
| OPS-012 | 后端：补齐账号凭证测试（AccountService.TestCredentials：Anthropic/OpenAI/Gemini） | 2026-01-24 | `cd backend; go test ./...` PASS |
| UI-017 | 前端：DataTable 排序状态本地持久化（sortStorageKey）覆盖 User/Admin 表格页，减少重复操作 | 2026-01-24 | `pnpm -C frontend lint` PASS; `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| UI-016 | 前端：补齐 layout 文档（TablePageLayout/PageToolbar）并修正过期说明 | 2026-01-24 | `pnpm -C frontend lint` PASS; `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| UI-015 | 前端：DataTable 可访问性增强（sortable header 支持 Tab/Enter/Space + aria-sort，避免交互元素冒泡误触发排序） | 2026-01-24 | `pnpm -C frontend lint` PASS; `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| UI-014 | 前端：User Keys/Usage 表格页接入 PageToolbar（统一 toolbar 结构）+ Usage KPI 收口到表格卡片（更省高）+ 数值列 numeric/align | 2026-01-24 | `pnpm -C frontend lint` PASS; `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| OPS-015 | 后端：实现兑换码统计（GET /api/v1/admin/redeem-codes/stats） | 2026-01-24 | `cd backend; go test ./...` PASS |
| UI-013 | 前端：DataTable sticky header 滚动状态增强（滚动后 header 分隔更清晰） | 2026-01-24 | `pnpm -C frontend lint` PASS; `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| UI-012 | 前端：表格页统一 PageToolbar（搜索/过滤/动作合并为单条工具栏）并覆盖所有 admin 表格页 | 2026-01-24 | `pnpm -C frontend lint` PASS; `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| OPS-014 | 后端：实现管理端组统计（GET /api/v1/admin/groups/:id/stats） | 2026-01-24 | `cd backend; go test ./...` PASS |
| BUG-003 | 测试：取消跳过并修复 ConcurrencyCache GetAccountsLoadBatch 集成测试 | 2026-01-24 | `cd backend; go test -tags=integration ./internal/repository -run TestConcurrencyCacheSuite -count=1` PASS |
| BUG-004 | 前端：修复 DropdownMenu lint（vue/no-dupe-keys：open 冲突） | 2026-01-24 | `pnpm -C frontend lint:check` PASS |
| UI-011 | 前端：统一 EmptyState/ErrorState + 表单错误提示可访问性收口（FormField 模式），降低操作摩擦 | 2026-01-24 | `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| UI-010 | 前端：Command Palette（Ctrl/Cmd+K）快速跳转/常用动作（含 Sidebar/Theme/Docs actions），减少后台高频操作路径 | 2026-01-24 | `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| UI-009 | 前端：整体 UI/UX——布局密度与空间复用（Header/Sidebar/Main padding）+ 表格页全高稳健（移除硬编码 calc）+ glass/card 视觉收口 | 2026-01-24 | `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| SEC-018 | 后端：用户侧高成本接口增加“已鉴权”维度限流（user_id + IP），降低滥用/抓取风险 | 2026-01-24 | `cd backend; go test ./...` PASS |
| OPS-010 | 部署：示例配置默认关闭 `gateway.allow_google_query_key`（生产更安全，兼容可手动开启） | 2026-01-24 | `cd backend; go test ./...` PASS |
| SEC-017 | 后端：/api/v1 非网关接口增加 RequestBodyLimit（`server.api_max_body_size`，防大包 DoS） | 2026-01-24 | `cd backend; go test ./...` PASS |
| SEC-016 | 后端：OAuth 错误/日志响应体脱敏（JSON key + 非 JSON 文本兜底），避免 token/PII 泄露到错误栈与日志 | 2026-01-24 | `cd backend; go test ./...` PASS |
| UI-008 | 前端：AccountsView「列设置/自动刷新」下拉菜单统一改用 `DropdownMenu`（click-outside/ESC/ARIA/一致样式） | 2026-01-24 | `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| UI-007 | 前端：将 DataTable `numeric/align` 覆盖扩到 Accounts/Usage/Subscriptions 表格（对齐 + tabular-nums） | 2026-01-24 | `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| UI-006 | 前端：DataTable Column 扩展 `numeric/align`（tabular-nums + 对齐）并在 Users/PromoCodes/Redeem 试点 | 2026-01-24 | `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| UI-005 | 前端：Actions 列宽优化（icon-only + kebab menu）并复用 `DropdownMenu`（teleport + 自动定位） | 2026-01-24 | `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| UI-004 | 前端：UsersView 快捷筛选 chips（All/Active/Disabled）+ 高级筛选折叠到可收起区域 | 2026-01-24 | `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| UI-003 | 前端：`CopyButton` 组件 + Keys/PromoCodes/Redeem 统一复制交互（toast/可访问性一致） | 2026-01-24 | `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| UI-002 | 前端：`DropdownMenu` 组件（click outside/ESC/ARIA）+ Users/Subscriptions 下拉菜单收口 | 2026-01-24 | `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
| UI-001 | 前端：DataTable 增加 `density`（admin 默认 compact）+ 表格页 toolbar 合并 + 动效降噪（prefers-reduced-motion） | 2026-01-24 | `pnpm -C frontend test:run` PASS |
| SEC-015 | IP 获取信任边界：统一使用 gin.ClientIP + 依赖 trusted_proxies（防止伪造 XFF 绕过限流/白名单） | 2026-01-24 | `cd backend; go test ./...` PASS |
| SEC-014 | Admin API 读写分级限流（已鉴权）+ 可配置开关/阈值（避免误伤 dashboard 轮询） | 2026-01-24 | `cd backend; go test ./...` PASS |
| OPS-001 | 启动链路：补充 Windows/Docker Desktop 权限/服务检查指引（compose/本地启动） | 2026-01-24 | N/A (docs) |
| SEC-013 | 日志脱敏兜底：非 JSON 文本（Bearer/JWT/x-api-key/Cookie）正则脱敏 + Gin 错误日志脱敏（含测试） | 2026-01-24 | `cd backend; go test ./...` PASS |
| SEC-012 | 日志脱敏：网关 upstream error body（JSON key）脱敏 + Gemini 成功响应头日志仅输出 x-ratelimit；新增单测 | 2026-01-24 | `cd backend; go test ./...` PASS |
| SEC-011 | 管理员鉴权/权限边界：Admin JWT TokenVersion 校验 + admin invalid attempt 按 IP 限流 + 登录（IP+email/Email）暴力尝试防护；补齐部署配置示例 | 2026-01-24 | `cd backend; go test ./...` PASS |
| SEC-010 | Gemini /v1beta `?key=` 鉴权可配置禁用（默认兼容），并补齐无效 API key 按 IP 限流的部署配置项 + 测试覆盖 | 2026-01-23 | `cd backend; go test ./...` PASS |
| SEC-007 | API Key 鉴权：/v1beta 路径补齐 IP 白/黑名单校验，并对无效 key 做按 IP 限流（防爆破/DoS） | 2026-01-23 | `cd backend; go test ./...` PASS |
| SEC-008 | 登录/注册/发验证码：公开认证接口增加基础限流（降低滥用风险） | 2026-01-23 | `cd backend; go test ./...` PASS |
| SEC-009 | 日志脱敏：ProxyURL 去除 userinfo；邮箱输出脱敏；JSON 脱敏 key 集扩展 | 2026-01-23 | `cd backend; go test ./...` PASS |
| DOC-002 | 工具/文档：`check_pnpm_audit_exceptions.py` 兼容 PowerShell UTF-8 BOM 输出 | 2026-01-23 | `python tools/check_pnpm_audit_exceptions.py --audit code-reviews/pnpm-audit-frontend.json --exceptions .github/audit-exceptions.yml` PASS |
| DEP-002 | 部署模板：补齐 `validate_resolved_ip` / `ip_info_url` 环境变量示例 | 2026-01-23 | `cd backend; go test ./...` PASS |
| SEC-002 | 覆盖剩余 `io.ReadAll` 入口并统一加响应体上限（pricing/crs 等） | 2026-01-23 | `cd backend; go test ./...` PASS |
| SEC-003 | proxy probe URL 改为可配置 + 默认 HTTPS（避免明文 HTTP 第三方依赖） | 2026-01-23 | `cd backend; go test ./...` PASS |
| SEC-004 | allowlist 关闭时 SSRF 退化：评估并补强（最小格式校验 + 解析后 IP 校验的可选安全阈值） | 2026-01-23 | `cd backend; go test ./...` PASS |
| DOC-001 | 文档：补充 `SUB2API_OPENCODE_FETCH_ENABLED` 行为与风险提示 | 2026-01-23 | `docs/dependency-security.md` added |
| DEP-001 | 前端依赖升级/收敛（lodash / esbuild 等 Moderate 漏洞） | 2026-01-23 | `pnpm -C frontend audit` (only xlsx highs); `pnpm -C frontend test:run` PASS; `pnpm -C frontend build` PASS |
