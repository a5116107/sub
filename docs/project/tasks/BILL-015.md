# BILL-015: Billing: pricing missing must not bill as $0

> Status: ✅ Verified (2026-02-02)
> 验证：`cd backend; go test ./...` PASS

## 背景/问题（以代码为准）

修复前：当模型价格缺失/价格服务异常导致 `CalculateCost` 返回 error 时，记账链路会把费用当成 0 继续走下去：

修复前证据：
- `backend/internal/service/gateway_service.go`：`CalculateCost` err -> `cost = &CostBreakdown{ActualCost: 0}`
- `backend/internal/service/openai_gateway_service.go`：`CalculateCost` err -> `cost = &CostBreakdown{ActualCost: 0}`
- `backend/internal/service/billing_service.go`：`GetModelPricing` 受 `Pricing.MissingPolicy` 影响，可能返回 error（例如 `fail_close` / `fallback_claude_only` + 非 Claude 模型）

影响：
- 上游请求可能成功，但系统扣费为 0（按量/订阅都可能受到影响），形成“计费少扣/不扣”的隐蔽面。

## 目标

- 无论价格缺失策略如何，都不能出现“模型价格缺失 -> 扣费为 0 且继续成功响应”的静默降级。

## 方案选项（A/B/C）

| 选项 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| A（推荐） | 在转发前做 pricing 可用性预检查：缺失则直接拒绝请求（503/400），避免上游消耗 | 真正 fail-close；不会白嫖上游 | 需要在多协议入口统一校验；对客户端是行为变化 |
| B | RecordUsage 遇到 pricing error 时直接返回 error，并触发告警；同时把该请求标记为“计费异常”进入补偿队列 | 改动相对小；可追溯 | 由于 RecordUsage 多为异步，仍可能先成功响应 |
| C | 强制 fallback_any（缺失时用 fallback 价格）并记录告警 | 不会 $0 | 价格可能不准确（但比 0 更安全） |

默认推荐 A（该策略才与 “fail_close” 含义一致）。

## 已实现（选项 A）

- 在转发上游前做 pricing 可用性预检查：价格缺失/定价服务不可用时，直接返回 503（`billing_error`），不再消耗上游额度。
- 覆盖入口：`GatewayService.Forward`（Claude /v1/messages）与 `OpenAIGatewayService.Forward`（OpenAI /v1/responses 等）。
- 同时，记账阶段 `CalculateCost` 失败不再静默降级为 `ActualCost=0`。

## 验收标准

- [ ] pricing 缺失时，不会产生 `ActualCost=0` 的成功计费记录
- [ ] `cd backend; go test ./...` PASS
