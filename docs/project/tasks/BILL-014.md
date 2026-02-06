# BILL-014: Billing: close usage log insert bypass + fix idempotency undercharge

> Status: ✅ Verified (2026-02-02)
> 验证：`cd backend; go test ./...` PASS

## 背景/问题（以代码为准）

### 1) [计费绕过] 用量日志写库失败会被吞掉，导致不扣费/不记账

- 修复点（以代码为准）：
  - `backend/internal/service/gateway_service.go`：`usageLogRepo.Create(...)` 失败后返回 error（不再吞掉）
  - `backend/internal/service/openai_gateway_service.go`：`usageLogRepo.Create(...)` 失败后返回 error（不再吞掉）
  - `backend/internal/repository/usage_log_repo.go`：写库前统一 UTF-8 归一 + MaxLen 截断，降低可被用户输入触发的 insert 失败面
- 影响（修复前）：攻击者只要能稳定触发写库失败，就能消耗上游额度但不扣费（尤其当前 RecordUsage 是异步 goroutine）。

### 2) [计费少扣] 复用 Idempotency-Key 会转发上游多次，但本系统只扣一次

- 证据：
  - `backend/internal/server/middleware/client_request_id.go`：`Idempotency-Key`/`X-Idempotency-Key` 会被采纳为 `ctxkey.ClientRequestID`
  - `backend/internal/service/gateway_service.go` / `openai_gateway_service.go`：不再使用客户端 `ClientRequestID` 覆盖 billing `request_id`（billing `request_id` 来自上游 `x-request-id`，缺失则生成 UUID）
  - `backend/internal/repository/usage_log_repo.go`：`ON CONFLICT (request_id, api_key_id) DO NOTHING`（幂等去重；不再因复用幂等头产生冲突）
- 结果（修复前）：同一 key 重复请求仍会转发上游，但因为落到同一条 `usage_log/billing_entry`，后续不会再扣费（可被滥用消耗上游额度）。

### 3) [可触发写库失败] request_id/model/user_agent 等字段缺少统一“截断/UTF-8 归一”

- 证据：
  - `backend/ent/schema/usage_log.go`：`request_id` MaxLen=64，`model` MaxLen=100，`user_agent` MaxLen=512
  - `backend/internal/server/middleware/client_request_id.go`：客户端请求 ID 最大允许 128（可进入 billing request_id 链路）
  - 现已在写库前统一截断/归一（`usage_log_repo.go`），避免可构造超长/非法 UTF-8 导致 insert 失败

## 目标（安全/正确性）

- 任意一次成功上游转发，都必须生成“可写入 DB 的 usage_log”，并产生对应的 billing 记录；不能被用户输入触发写库失败来绕过扣费。
- billing 幂等键（`usage_logs.request_id`）不得来自客户端 Header（`Idempotency-Key`/`X-Request-Id` 等），且必须 <= 64。

## 方案（最小改动 + 防御性）

1) `GatewayService.RecordUsage` / `OpenAIGatewayService.RecordUsage`：不再使用客户端 `ClientRequestID` 覆盖 `result.RequestID`（避免复用幂等头导致只扣一次）。
2) 当上游未返回 request id 时，在记账侧生成 UUID，保证 `usage_logs.request_id` 非空且稳定可写库。
3) `usageLogRepo.Create`：对 `request_id/model/billed_model/user_agent/ip_address/image_size` 做：
   - `strings.ToValidUTF8`
   - rune 级截断到 ent schema MaxLen（避免 varchar 超长/非法字节导致 insert 失败）
4) `RecordUsage` 遇到 `usageLogRepo.Create` error：返回 error（不吞掉），由调用方日志/监控捕捉（不能再静默失败）。

## 验收标准

- [ ] 重放同一 `Idempotency-Key` 两次：仍会生成两条 `usage_logs` 并各自计费（不再“只扣一次但上游多次转发”）。
- [ ] 超长 `Idempotency-Key`/`model`/`User-Agent` 不再导致 usage_log insert 失败（字段被安全截断/归一）。
- [ ] 任意 usage_log insert 失败会返回 error（不会被吞掉）。
- [ ] `cd backend; go test ./...` PASS
