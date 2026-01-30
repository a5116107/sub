# Changelog

> Record task status changes and priority adjustments (reverse chronological)

---

## 2026-01-26

### New Tasks

- COMP-001: Gateway: OpenAI `POST /v1/chat/completions` + `POST /v1/completions` compatibility (stream/tools/multimodal; Codex OAuth adapter)
- COMP-002: Gateway: Gemini CLI `POST /v1internal:{method}` allowlist + SSE (Gemini CLI compatibility)
- COMP-003: Gateway: Amp CLI route aliases `/api/provider/{provider}/v1...` + model mapping (MVP)
- COMP-004: Provider: Qwen support (spike -> auth/executor/models/usage)
- COMP-005: Provider: iFlow support (spike -> auth/executor/models/usage)
- COMP-006: Gateway: Generic payload rules engine (default/override/raw; protocol+model matching)
- SDK-001: SDK: Public Go client SDK (gateway+admin typed client) + docs/examples
- COMP-007: Compliance spike: "cloak/compat mode" scope review; implement safe subset only (no obfuscation)

### Completed

| Time | ID | Change Type | Before | After | Reason |
|------|----|------------|--------|-------|--------|
| 13:48 | COMP-003 | Status | Pending | Completed | Add Amp-style provider aliases under `/api/provider/{provider}/...` mapped to existing gateway handlers |
| 13:40 | COMP-001 | Status | Pending | Completed | Add OpenAI `/v1/chat/completions` + `/v1/completions` endpoints via Responses adapter (stream + non-stream) |
| 12:19 | COMP-002 | Status | Pending | Completed | Add Gemini CLI `/v1internal:{method}` gateway endpoint (allowlist + SSE pass-through + billing/concurrency/failover) |

## 2026-01-25

### Completed

| Time | ID | Change Type | Before | After | Reason |
|------|----|------------|--------|-------|--------|
| 21:15 | OPS-020 | Status | Pending | Completed | Change default cache_control removal strategy to `messages_tail_then_head` (better prefix cache preservation) |
| 21:15 | OPS-019 | Status | Pending | Completed | Treat proxy request errors as failoverable to switch accounts/proxies automatically |
| 18:23 | DOC-004 | Status | Pending | Completed | Add cache/scheduling playbook SSOT (LB vs Sticky, upstream cache tuning, Redis key prefix, skipped tests) |
| 17:24 | OBS-001 | Status | Pending | Completed | Add cache read/creation tokens to trend/stats and visualize cache hit rate |
| 10:23 | CI-003 | Status | Pending | Completed | Add dedicated CI job for `rate_limiter_integration_test.go` and fail on Skip |
| 10:23 | CI-002 | Status | Pending | Completed | Add workflow_dispatch e2e job; make `e2e_gateway_test.go` read `E2E_*` keys from env |
| 10:23 | CI-001 | Status | Pending | Completed | Add workflow_dispatch network job for `tlsfingerprint/dialer_test.go` |
| 08:42 | OPS-018 | Status | Pending | Completed | Add global Redis `redis.key_prefix` hook (keys + Pub/Sub channels) |
| 08:42 | OPS-017 | Status | Pending | Completed | Make `enforceCacheControlLimit` removal strategy configurable (head/tail/hybrid) |
| 08:42 | OPS-016 | Status | Pending | Completed | Make sticky session TTL configurable (`gateway.scheduling.sticky_session_ttl`) |

## 2026-01-24

### Completed

| Time | ID | Change Type | Before | After | Reason |
|------|----|------------|--------|-------|--------|
| 20:44 | DOC-003 | Status | Pending | Completed | Fix `.gitignore` so `docs/project` SSOT docs are trackable |
| 19:41 | OPS-012 | Status | Pending | Completed | 实现 AccountService.TestCredentials 的凭证校验（Anthropic/OpenAI/Gemini），并补齐单测 |
| 19:40 | OPS-011 | Status | Pending | Completed | 实现 AdminService.RefreshAccountCredentials：统一刷新 OAuth 凭证并失效 token 缓存 |
| 19:39 | OPS-013 | Status | In Progress | Completed | ProxyService.TestConnection 接入 ProxyExitInfoProber 探测代理连通性 |
| 19:37 | UI-017 | Status | Pending | Completed | DataTable sortStorageKey 覆盖 User/Admin 表格页（排序状态持久化，减少重复操作） |
| 19:23 | UI-016 | Status | Pending | Completed | 补齐 `frontend/src/components/layout/README.md`（TablePageLayout/PageToolbar）并修正过期说明 |
| 19:23 | UI-015 | Status | Pending | Completed | DataTable sortable header 可访问性增强：Tab 聚焦 + Enter/Space 触发排序 + aria-sort；点击/键盘事件忽略交互元素冒泡 |
| 19:07 | UI-014 | Status | Pending | Completed | User Keys/Usage 表格页接入 PageToolbar（统一 toolbar 结构），Usage KPI 收口到表格卡片并补齐数值列 numeric/align |
| 18:53 | OPS-015 | Status | In Progress | Completed | 实现 `/api/v1/admin/redeem-codes/stats`：按状态/类型聚合计数与已发放面值汇总（GetStats） |
| 18:47 | UI-013 | Status | Pending | Completed | DataTable：sticky header 增加滚动状态分隔（滚动后 header 更清晰不“糊”在一起） |
| 18:47 | UI-012 | Status | Pending | Completed | 表格页：新增 PageToolbar 并在 TablePageLayout 支持 `#toolbar`，统一 admin 表格页搜索/过滤/动作布局 |
| 18:43 | OPS-014 | Status | In Progress | Completed | 实现 `/api/v1/admin/groups/:id/stats`：统计 API Keys 数量与 usage logs（requests/cost）聚合 |
| 18:18 | BUG-003 | Status | In Progress | Completed | GetAccountsLoadBatch 改用 KEYS 传入（兼容 Redis 前缀隔离），取消集成测试 Skip 并验证通过 |
| 18:09 | BUG-004 | Status | In Progress | Completed | 修复 DropdownMenu `open` 冲突（vue/no-dupe-keys），恢复前端 lint 可用性 |
| 18:09 | UI-011 | Status | Pending | Completed | 统一 EmptyState/ErrorState + FormField 表单错误可访问性收口，覆盖 Auth/Setup/Redeem 等关键流程 |
| 17:45 | UI-010 | Status | Pending | Completed | Command Palette（Ctrl/Cmd+K）：快速跳转与常用动作（Sidebar/Theme/Docs），减少后台高频操作路径 |
| 17:22 | UI-009 | Status | Pending | Completed | UI/UX：布局密度与空间复用（Header/Sidebar/Main padding）+ 表格页全高稳健（移除硬编码 calc）+ glass/card 视觉收口 |
| 16:38 | SEC-018 | Status | Pending | Completed | 用户侧高成本接口增加“已鉴权”维度限流（user_id + IP），降低滥用/抓取风险 |
| 15:53 | OPS-010 | Status | Pending | Completed | 部署模板默认关闭 `gateway.allow_google_query_key`（减少 query-string API key 泄露风险） |
| 15:35 | SEC-017 | Status | Pending | Completed | /api/v1 增加 RequestBodyLimit（`server.api_max_body_size`），降低大包 DoS 风险 |
| 15:22 | SEC-016 | Status | Pending | Completed | OAuth 响应体日志/错误脱敏：优先 JSON key 脱敏，非 JSON 文本用模式兜底（避免 token/PII 泄露） |
| 15:00 | UI-008 | Status | Pending | Completed | AccountsView：列设置/自动刷新下拉菜单统一改用 `DropdownMenu`（一致交互/无重复 click-outside 代码） |
| 14:32 | UI-007 | Status | Pending | Completed | Accounts/Usage/Subscriptions：扩展 DataTable `numeric/align` 覆盖（对齐 + tabular-nums） |
| 13:46 | UI-006 | Status | Pending | Completed | DataTable：Column 扩展 `numeric/align`（tabular-nums + 对齐）并在 Users/PromoCodes/Redeem 试点 |
| 13:14 | UI-004 | Status | Pending | Completed | UsersView：快捷筛选 chips（All/Active/Disabled）+ 高级筛选折叠到可收起区域 |
| 13:14 | UI-005 | Status | Pending | Completed | Actions 列宽优化：icon-only + kebab menu，并复用 `DropdownMenu`（teleport + 自动定位） |
| 12:23 | UI-001 | Status | Pending | Completed | 前端：DataTable 增加 `density`（admin 默认 compact）+ 表格页 toolbar 合并 + 动效降噪（prefers-reduced-motion） |
| 12:23 | UI-002 | Status | Pending | Completed | 前端：`DropdownMenu` 组件（click outside/ESC/ARIA）+ Users/Subscriptions 下拉菜单收口 |
| 12:23 | UI-003 | Status | Pending | Completed | 前端：`CopyButton` 组件 + Keys/PromoCodes/Redeem 统一复制交互（toast/可访问性一致） |
| 09:52 | SEC-015 | Status | Pending | Completed | IP 获取信任边界：统一使用 gin.ClientIP + 依赖 trusted_proxies（防止伪造 XFF 绕过限流/白名单） |
| 09:52 | SEC-014 | Status | Pending | Completed | Admin API 读写分级限流（已鉴权）+ 可配置开关/阈值（避免误伤 dashboard 轮询）；补齐单测 |
| 09:52 | OPS-001 | Status | Pending | Completed | 启动链路：补充 Windows/Docker Desktop 启动自检指引（README/README_CN） |
| 09:23 | SEC-013 | Status | In Progress | Completed | 日志脱敏兜底：非 JSON 文本（Bearer/JWT/x-api-key/Cookie）正则脱敏 + Gin 错误日志脱敏（含测试） |
| 09:11 | SEC-011 | Status | Pending | Completed | 管理员鉴权/权限边界：Admin JWT TokenVersion 校验 + admin invalid attempt 按 IP 限流 + 登录（IP+email/Email）暴力尝试防护；补齐部署配置示例 |
| 09:11 | SEC-012 | Status | Pending | Completed | 日志脱敏：网关 upstream error body（JSON key）脱敏 + Gemini 成功响应头日志仅输出 x-ratelimit；新增单测 |

### New Tasks

- UI-001: 前端：DataTable 增加 `density`（admin 默认 compact）+ 表格页 toolbar 合并 + 动效降噪（prefers-reduced-motion）
- UI-002: 前端：`DropdownMenu` 组件（click outside/ESC/ARIA）+ Users/Subscriptions 下拉菜单收口
- UI-003: 前端：`CopyButton` 组件 + Keys/PromoCodes/Redeem 统一复制交互（toast/可访问性一致）
- UI-004: UsersView：快捷筛选 chips（Active/Disabled）+ 高级筛选折叠到 “More filters”
- UI-005: Actions 列宽优化：常用 2 个按钮 + 其余收进 kebab menu（复用 `DropdownMenu`）
- UI-006: DataTable：Column 扩展 `numeric/align`（tabular-nums + 右对齐）提升数据可扫性
- UI-007: Accounts/Usage/Subscriptions 表格补齐 `numeric/align`（tabular-nums + 对齐）
- UI-008: AccountsView「列设置/自动刷新」下拉菜单统一改用 `DropdownMenu`（一致交互）
- UI-009: 前端：整体 UI/UX——布局密度与空间复用 + 表格页全高稳健 + glass/card 视觉收口
- UI-010: 前端：Command Palette（Ctrl+K）快速跳转/常用动作，减少后台高频操作路径
- UI-011: 前端：统一 EmptyState/ErrorState + 表单错误提示可访问性收口（FormField 模式）
- UI-012: 前端：表格页统一 PageToolbar（搜索/过滤/动作合并为单条工具栏）并覆盖所有 admin 表格页
- UI-013: 前端：DataTable sticky header 滚动状态增强（滚动后 header 分隔更清晰）
- SEC-016: OAuth 错误/日志响应体脱敏（JSON key + 非 JSON 文本兜底）
- SEC-017: /api/v1 非网关接口增加 RequestBodyLimit（可配置上限，防大包 DoS）
- SEC-018: 用户侧高成本接口增加“已鉴权”维度限流（user_id + IP）
- SEC-013: 日志脱敏兜底：非 JSON 文本（Bearer/JWT/x-api-key/Cookie）正则脱敏 + Gin 错误日志脱敏
- SEC-014: Admin API 读写分级限流（已鉴权）+ 可配置开关/阈值（避免误伤 dashboard 轮询）
- SEC-015: IP 获取信任边界：统一使用 gin.ClientIP + 依赖 trusted_proxies（防止伪造 XFF 绕过限流/白名单）
- OPS-010: 部署示例配置默认关闭 `gateway.allow_google_query_key`（生产更安全，兼容可手动开启）
- OPS-001: 启动链路：补充 Windows/Docker Desktop 权限/服务检查指引（compose/本地启动）

- OPS-011: 后端：补齐账号凭证刷新（AdminService.RefreshAccountCredentials）
- OPS-012: 后端：补齐账号凭证测试（AccountService.TestCredentials：Anthropic/OpenAI/Gemini）
- OPS-013: 后端：补齐代理连通性测试（ProxyService.TestConnection）
- OPS-014: 后端：实现管理端组统计（GET /api/v1/admin/groups/:id/stats）
- OPS-015: 后端：实现兑换码统计（GET /api/v1/admin/redeem-codes/stats）
- BUG-003: 测试：取消跳过并修复 ConcurrencyCache GetAccountsLoadBatch 集成测试
- BUG-004: 前端：修复 DropdownMenu lint（vue/no-dupe-keys：open 冲突）

## 2026-01-23

### Completed

| Time | ID | Change Type | Before | After | Reason |
|------|----|------------|--------|-------|--------|
| 23:50 | SEC-010 | Status | Pending | Completed | Gemini /v1beta `?key=` 可配置禁用（默认兼容）；补齐无效 API key 按 IP 限流的部署配置项与测试覆盖 |
| 23:30 | SEC-007 | Status | Pending | Completed | API Key 鉴权补齐 /v1beta IP 白/黑名单校验，并增加无效 key 的按 IP 限流以降低爆破/DoS 风险 |
| 23:30 | SEC-008 | Status | Pending | Completed | 登录/注册/发验证码接口添加基础限流（Redis 故障下发码 fail-close）以降低滥用风险 |
| 23:30 | SEC-009 | Status | Pending | Completed | 日志脱敏加强：ProxyURL 去 userinfo；邮箱脱敏；JSON 脱敏 key 集扩展（Authorization/Cookie/x-api-key 等） |
| 22:57 | DOC-002 | Status | Pending | Completed | `check_pnpm_audit_exceptions.py` 支持读取带 UTF-8 BOM 的 pnpm audit JSON，并在 SSOT 文档中注明 |
| 22:57 | DEP-002 | Status | Pending | Completed | 部署模板补齐 `SECURITY_URL_ALLOWLIST_VALIDATE_RESOLVED_IP` / `SECURITY_PROXY_PROBE_IP_INFO_URL` 示例，便于生产配置落地 |
| 22:21 | DEP-001 | Status | Pending | Completed | pnpm overrides 收敛 lodash/lodash-es/esbuild，修复 Moderate 漏洞并保留 xlsx 例外（有到期日） |
| 22:07 | SEC-002 | Status | Pending | Completed | 剩余 `io.ReadAll` 入口补齐上限，避免 OOM/DoS（含 proxy probe / oauth helper 等） |
| 22:07 | SEC-003 | Status | Pending | Completed | proxy probe URL 支持配置，默认切换到 HTTPS |
| 22:07 | SEC-004 | Status | Pending | Completed | allowlist 关闭时仍可选启用 resolved-IP 校验（按配置阻断私网/回环） |
| 22:07 | DOC-001 | Status | Pending | Completed | 补齐依赖/供应链安全文档与 `SUB2API_OPENCODE_FETCH_ENABLED` 风险提示 |
| 21:09 | SEC-001 | Status | Pending | Completed | API Key 改为哈希存储（不落库明文）+ 仅返回 prefix，并通过前后端测试 |
| 20:34 | BUG-001 | Status | Pending | Completed | Windows 下超限下载清理修复并通过后端测试 |
| 20:34 | BUG-002 | Status | Pending | Completed | Vitest 配置兼容修复并通过前端测试 |
| 20:34 | SEC-005 | Status | Pending | Completed | opencode 拉取默认禁用并加安全护栏（超时/上限/singleflight） |
| 20:34 | SEC-006 | Status | Pending | Completed | 上游响应读取加上限并通过后端测试 |

### New Tasks

- SEC-001: API Key 改为哈希存储（不落库明文）+ 兼容迁移方案
- SEC-002: 覆盖剩余 `io.ReadAll` 入口并统一加响应体上限（pricing/crs 等）
- SEC-003: proxy probe URL 改为可配置 + 默认 HTTPS
- SEC-004: allowlist 关闭时 SSRF 退化：评估并补强
- DEP-001: 前端依赖升级/收敛（lodash / esbuild 等 Moderate 漏洞）
- DOC-001: 文档：补充 `SUB2API_OPENCODE_FETCH_ENABLED` 行为与风险提示
- DEP-002: 部署模板：补齐 `validate_resolved_ip` / `ip_info_url` 环境变量示例
- DOC-002: 工具/文档：pnpm audit JSON（PowerShell UTF-8 BOM）兼容
- SEC-007: API Key 鉴权：/v1beta IP 白/黑名单校验 + 无效 key 限流
- SEC-008: 公开认证接口限流（登录/注册/发验证码）
- SEC-009: 日志脱敏全量覆盖（邮箱/ProxyURL/敏感 JSON key）
- SEC-010: Gemini /v1beta `?key=` 鉴权可配置禁用（默认兼容）+ 无效 key 限流配置落盘与测试覆盖
