# BILL-017: Billing: subscription cache double-count when using reservation finalization

> Status: ✅ Completed (2026-02-03)
> 验证：`cd backend; go test ./...`

## 背景/问题（以代码为准）

订阅模式请求在转发上游前会做额度预留（Redis 原子脚本），并在记账完成后调用 `FinalizeSubscriptionReservation(reserved, actual)`。

但现有实现同时还会额外调用 `QueueUpdateSubscriptionUsage(actual)`，而 `FinalizeSubscriptionUsage` 的 Lua 脚本本身已经会把 `actual` 增加到 `daily/weekly/monthly_usage`。

结果：在“使用预留额度”的订阅请求里，订阅用量缓存会被 `actual` **累加两次**，导致限额提前触发（误杀/过严）。

## 影响范围

- Anthropic 网关：`GatewayService.RecordUsage`
- OpenAI 网关：`OpenAIGatewayService.RecordUsage`

## 修复方案（已落地）

- 当 `RecordUsageInput.ReservedUSD > 0`（意味着本次请求走过“预留额度”），只执行 `FinalizeSubscriptionReservation`，不再额外 `QueueUpdateSubscriptionUsage`。
- 当 `ReservedUSD <= 0`（没有走预留），继续使用 `QueueUpdateSubscriptionUsage` 以保持旧逻辑可用。

## 验收标准

- [x] 订阅模式 + 预留额度路径下，订阅缓存用量不会被重复累加
- [x] `cd backend; go test ./...` PASS

