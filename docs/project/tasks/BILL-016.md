# BILL-016: Billing: durable ledger when usage log write fails (infra outage)

> Status: ✅ Completed (2026-02-03)
> 验证：`cd backend; go test ./...`；`pnpm -C frontend test:run`；`pnpm -C frontend build`

## 背景/问题（以代码为准）

当前网关请求在上游成功后，会通过异步 goroutine 记录 usage_log 并扣费。即使我们已把写库错误改为“返回 error 并记录”，在 DB/Redis 故障等基础设施异常时，仍可能出现：

- 客户端已拿到成功响应
- 但 usage_log / billing_entry 记账失败（上游额度被消耗，本地未记账）

这是架构层面的“计费可靠性”风险，不是单纯输入校验能完全解决。

## 目标

- 在基础设施异常时，尽量避免“成功响应但未记账”的窗口，或提供可恢复的补偿机制（至少可审计、可重放、可告警）。

## 最终方案（已落地）

在 `usage_logs` 写库失败时（例如 DB 故障），将完整的“可重放记账事件”落到本机磁盘，再由后台 worker 定期重放：

- 新增 `BillingSpoolService`：目录 `billing.spool.dir` 下维护 `pending/processing/done/` 三段队列；支持崩溃恢复（`processing` 自动回滚到 `pending`）。
- `GatewayService.RecordUsage` / `OpenAIGatewayService.RecordUsage`：当 `usageLogRepo.Create` 失败时：
  - 构造 `BillingSpoolEvent`（包含 usage_log 全量字段 + delta_usd + billing_type + subscription_id/group_id + inviter_user_id 快照）
  - `billingSpoolService.Enqueue(...)` 成功则视为“已记录”（返回 `nil`），避免被动出现“免费成功请求”。
- `BillingSpoolService` 重放时使用 DB 事务：
  - 幂等插入 `usage_logs`（`(request_id, api_key_id)` 冲突跳过）
  - 幂等插入 `billing_usage_entries`（`usage_log_id` 冲突跳过）
  - 对未 applied 的 entry 执行扣费/订阅用量增量并 `MarkBillingUsageEntryApplied`
  - 事务提交后异步刷新缓存（余额/订阅用量）并 best-effort 结算返佣

注意：当前请求仍保持“上游先返回 + 后台记账”的异步模型；该改动的目标是保证“写库失败时仍可恢复记账”，而不是把整个链路改为同步 fail-close。

### 配置项（默认开启）

- `billing.spool.enabled`：是否启用落盘队列（默认 `true`）
- `billing.spool.dir`：落盘目录（默认 `./data/billing_spool`）
- `billing.spool.flush_interval`：后台重放间隔（默认 `30s`）
- `billing.spool.batch_size`：每轮最多处理条数（默认 `200`）
- `billing.spool.timeout`：每轮处理超时（默认 `5s`）

## 验收标准（示例）

- [x] 当 `usage_logs` 写入失败时：产生可重放的 billing event（不静默丢失）
- [x] 事件可被后台重放并完成“写 usage_log + 记账 applied”
- [x] `cd backend; go test ./...` PASS
- [x] `pnpm -C frontend test:run` PASS；`pnpm -C frontend build` PASS
