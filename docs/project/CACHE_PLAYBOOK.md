# Cache & Scheduling Playbook (SSOT)

> **Last Updated**: 2026-01-25
>
> 目标：解释并固化与“上游 prompt cache 命中率 / 负载均衡 / 粘性会话 / Redis 多环境隔离 / 条件跳过测试”相关的设计与配置。

---

## 1) 术语与现状

### 上游缓存（Upstream Prompt Cache）

这里的“上游缓存命中率”指：上游大模型平台（例如 OpenAI/Anthropic）对 **prompt 前缀/片段** 的缓存复用。

- 常见信号：usage 里会出现 `cache_read_tokens` / `cache_creation_tokens`（不同平台字段略有差异）。
- 命中越高，通常意味着：
  - 端到端延迟降低（上游少做重复计算）
  - 输入 token 计费/配额更友好（取决于平台策略）

本仓库已落地 OBS-001：将 `cache_read_tokens` / `cache_creation_tokens` 聚合并做命中率/趋势可视化（管理端 Usage 页面）。

### 下游缓存（Downstream / Our Side）

这里更贴近“我们系统内部为了更快/更稳而做的缓存/状态”：

- **API Key Auth Cache**：认证结果 L1（进程内）+ L2（Redis）缓存，降低 DB/加密开销。
- **Dashboard Cache**：仪表盘聚合结果缓存（Redis）。
- **Sticky Session**：会话 -> 上游账号绑定（Redis），提升同一会话内上游 prompt cache 复用概率。
- **Concurrency / Scheduling 状态**：并发槽位、排队计数等（Redis/Lua），保证限流与公平性。

---

## 2) 负载均衡（LB）与粘性会话（Sticky Session）是否冲突？

### 两者都存在，且目标不同

- **负载均衡**：把请求分摊到“当前更可用/更空闲”的上游账号上，避免单账号过载导致 429/超时。
- **粘性会话**：尽量把“同一会话”的后续请求路由到同一个上游账号，以便复用上游的 prompt cache（通常是按 API Key/账号维度生效）。

### 潜在冲突（真实会发生）

- 粘性会话 **越强（TTL 越长）**：
  - 上游 prompt cache 命中率通常更高
  - 但“热点会话”更容易把某个账号打满 → 排队/超时/429 上升
- 负载均衡 **越激进（更频繁切换账号）**：
  - 更抗热点
  - 但会话在多个账号间漂移 → 上游 prompt cache 命中率下降

### 缓解手段（推荐的调参方向）

1. **让 TTL 可配**：对齐不同上游的缓存窗口，避免一刀切。
2. **排队/兜底策略**：粘性账号满载时短暂等待；再不行再 fallback 到其他账号。
3. **减少破坏“前缀缓存”的改写**：尤其是 cache_control 超限时的移除策略（见第 3 节）。

代码入口（便于定位）：

- Anthropic/Claude 调度：`backend/internal/service/gateway_service.go`
- OpenAI 调度：`backend/internal/service/openai_gateway_service.go`

---

## 3) 提升上游 prompt cache 命中率：关键配置

### 3.1 Sticky Session TTL（已做成可配置）

配置项（示例见 `deploy/config.example.yaml`）：

- `gateway.scheduling.sticky_session_ttl`：默认 1h
- `gateway.scheduling.openai_sticky_session_ttl`：OpenAI 单独覆盖（可选；不配则继承 sticky_session_ttl）

建议：

- 如果你的上游缓存窗口更短：把 TTL 调短（减少热点绑定、减少 Redis 键膨胀）。
- 如果你的上游缓存窗口更长：把 TTL 调长（更利于命中）。
- 如果不同上游窗口差异大：用 `openai_sticky_session_ttl` 做差异化。

### 3.2 `enforceCacheControlLimit` 移除策略（可切换/可组合）

背景：Anthropic 对 `cache_control` 块数量存在上限（最多 4 个）。超过后必须移除一部分 `cache_control`，否则会被上游拒绝或报错。

问题：以前优先从 messages 头部移除，可能更伤“前缀缓存”（因为更早的内容更可能成为可复用前缀）。

现在支持配置：

- `gateway.cache_control_limit_removal_strategy`
  - `messages_tail_then_head`（默认：优先尾部，必要时再移头部；通常更利于“前缀缓存”命中）
  - `messages_tail`（通常更利于前缀命中）
  - `messages_head`（更保守）
  - `messages_head_then_tail`（优先头部，必要时再移尾部）

推荐：

- 优先尝试 `messages_tail` 或 `messages_tail_then_head`，观察上游 `cache_read_tokens` 的变化与热点情况。

### 3.3 Redis 多环境隔离：统一 key prefix（已落地）

配置项：

- `redis.key_prefix`

作用：

- 给 **所有** Redis key（含 Pub/Sub channel、Lua 脚本 keys）统一加环境前缀，避免多环境共用同一 Redis DB 时互相污染。
- 便于按环境统计：例如以 `prod:` / `staging:` 为前缀做 keyspace 统计、命中率对比。

实现方式：

- 在 Redis client 层通过 go-redis hook 统一前缀（不要求各业务点逐个改 key 拼接逻辑）。

注意事项：

- 这是“前缀隔离”，不是“自动迁移”。启用后新 key 会带前缀；旧 key 仍然存在，必要时请评估是否需要清理旧 key（例如换 DB / flush / 迁移脚本）。
- 与 `dashboard_cache.key_prefix` 可以共存：最终 key 形如 `{redis.key_prefix}{dashboard_cache.key_prefix}...`（利于同时做“环境隔离 + 逻辑分区”）。

### 3.4 代理请求失败的 failover（间接切换代理）

当账号配置了代理（proxy）且请求在建立连接/发送阶段失败时（例如代理出口不通），网关会将其视为可 failover 的错误：

- 上层 handler 会切换到其他可用账号（因此也可能切换到其他代理出口）。
- 这能降低“单代理故障导致请求直接失败”的概率。

注意：

- 当前没有“同一账号多代理轮换”的机制；要实现实际代理切换，需要存在其他账号绑定到其他代理（或无代理）。

---

## 4) “条件跳过测试”为何会掩盖回归？怎么管控？

一些测试属于“网络/集成/E2E”级别，会在缺少依赖时 `t.Skip()`：

- `backend/internal/pkg/tlsfingerprint/dialer_test.go`：`-short` 模式会跳过网络/集成测试。
- `backend/internal/integration/e2e_gateway_test.go`：仅在特定模式/且提供 `E2E_*` 上游 key 时运行。
- `backend/internal/middleware/rate_limiter_integration_test.go`：Docker/testcontainers 不可用时跳过。
- `backend/internal/repository/concurrency_cache_benchmark_test.go`：未设置 `TEST_REDIS_URL` 会跳过基准（注意这是 benchmark，不在默认 `go test ./...` 范围）。

风险点：

- 如果你的 CI/本地运行方式“刚好触发 Skip”，会出现“全绿但没覆盖真实链路”的错觉。

建议的运维闭环：

1. 把这些用例纳入 **独立 CI job**（要求依赖齐全，并在 Skip 时 fail）。
2. 或者纳入“预发自测 checklist”，在发版前显式执行。

本仓库已增加对应 CI 工作流（见 `.github/workflows/backend-ci.yml`），用于把“会 Skip 的链路”从日常单测中拆出来管理。

---

## 5) 建议的最小化配置模板（示例）

> 仅展示关键字段，完整示例以 `deploy/config.example.yaml` 为准。

```yaml
redis:
  key_prefix: "prod:sub2api:"

gateway:
  cache_control_limit_removal_strategy: "messages_tail"
  scheduling:
    sticky_session_ttl: 1h
    # openai_sticky_session_ttl: 30m
```
