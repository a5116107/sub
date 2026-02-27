# 按渠道/服务商调用教程（大白话版）

这篇文档解决 3 个问题：

1. 我到底该打哪个接口（`/v1/messages` / `/v1/chat/completions` / `/v1beta/...`）？
2. API Key 怎么带（Header 怎么写）？
3. 不同渠道/服务商有什么差异（Claude / OpenAI / Gemini / Qwen / iFlow / Antigravity）？

---

## 0. 你需要准备什么？

- `BASE_URL`：你的 Sub2API 站点地址  
  例：`https://sub2api.example.com`
- `SUB2API_KEY`：平台签发的下游 API Key（通常以 `sk-` 开头）

### API Key 怎么带？

推荐：

- `Authorization: Bearer <SUB2API_KEY>`

也支持：

- `x-api-key: <SUB2API_KEY>`
- `x-goog-api-key: <SUB2API_KEY>`（主要用于 Gemini SDK/CLI 兼容）

不推荐（已废弃/可能被禁用）：

- URL Query：`?key=...` / `?api_key=...`

---

## 1. 三套协议：选你需要的那套

| 你想用什么客户端/SDK | 走哪套协议 | 典型接口 |
|---|---|---|
| Claude/Anthropic 生态（Claude Code、Anthropic SDK） | Anthropic Messages | `POST /v1/messages` |
| OpenAI 生态（各种 OpenAI-compatible 客户端） | OpenAI Chat Completions | `POST /v1/chat/completions` |
| Gemini 生态（Gemini SDK/CLI） | Gemini v1beta | `POST /v1beta/models/{model}:generateContent` |

---

## 2. 路径前缀：默认 / Antigravity / provider 别名

默认情况下你直接用 `BASE_URL`：

- Claude：`BASE_URL/v1/messages`
- OpenAI：`BASE_URL/v1/chat/completions`
- Gemini：`BASE_URL/v1beta/...`

如果你要 **“只用 Antigravity 账号，不和其它渠道混着调度”**，用专用前缀：

- Claude：`BASE_URL/antigravity/v1/messages`
- Gemini：`BASE_URL/antigravity/v1beta/...`

如果你的客户端/工具链硬编码了 provider 路径（某些 Amp/中转工具），可以用别名：

- `BASE_URL/api/provider/openai/...`
- `BASE_URL/api/provider/anthropic/...`
- `BASE_URL/api/provider/gemini/...` 或 `BASE_URL/api/provider/google/...`

---

## 3. Claude / Anthropic（`/v1/messages`）

### 3.1 调用 messages（非流式）

```bash
curl -sS -X POST "$BASE_URL/v1/messages" \
  -H "Authorization: Bearer $SUB2API_KEY" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 128,
    "messages": [
      {"role": "user", "content": "Say hello in one word."}
    ]
  }'
```

你最少需要的字段：

- `model`：模型名
- `messages`：对话数组
- `max_tokens`：最多输出 token

常用可选字段：

- `stream`：是否流式（SSE）
- `temperature` / `top_p`：采样参数
- `system`：系统提示词
- `tools` / `tool_choice`：工具调用（如果你在上游侧启用了）

### 3.2 流式（SSE）

把 `stream` 设为 `true`，并在 `curl` 加 `-N`（不要缓冲）：

```bash
curl -N -X POST "$BASE_URL/v1/messages" \
  -H "Authorization: Bearer $SUB2API_KEY" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 128,
    "stream": true,
    "messages": [
      {"role": "user", "content": "hello"}
    ]
  }'
```

### 3.3 计 token（count_tokens）

`POST /v1/messages/count_tokens`，请求体和 messages 类似。

### 3.4 模型列表 & 用量

- `GET /v1/models`：返回你当前 API Key 分组允许使用的模型列表
- `GET /v1/usage`：返回余额/订阅剩余信息（用于部分客户端显示余额）

---

## 4. OpenAI / Qwen / iFlow（`/v1/chat/completions`）

这类接口长得都像 OpenAI。

### 4.1 Chat Completions（推荐）

```bash
curl -sS -X POST "$BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $SUB2API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "hello"}
    ],
    "stream": false
  }'
```

常用字段：

- `model`
- `messages`
- `stream`
- `temperature` / `top_p` / `max_tokens`

### 4.2 什么时候是 Qwen / iFlow？

关键点：**你用的是哪把 API Key**。

Sub2API 的 API Key 绑定了一个“分组”，分组会决定：

- 走哪个平台（`openai` / `qwen` / `iflow` / ...）
- 允许哪些模型
- 计费倍率、并发、限流等策略

所以你不需要在 URL 里写 “qwen/iflow”，只要用对应分组的 API Key 就行。

### 4.3 OpenAI Responses（仅 OpenAI 分组）

如果你的分组平台是 `openai`，还可以用：

- `POST /v1/responses`（也有别名 `POST /responses`）
- `POST /v1/responses/compact`（也有别名 `POST /responses/compact`）
- `POST /v1/responses/input_tokens`（也有别名 `POST /responses/input_tokens`）
- `GET /v1/responses/{response_id}`（也有别名 `GET /responses/{response_id}`）
- `DELETE /v1/responses/{response_id}`（也有别名 `DELETE /responses/{response_id}`）
- `POST /v1/responses/{response_id}/cancel`（也有别名 `POST /responses/{response_id}/cancel`）
- `GET /v1/responses/{response_id}/input_items`（也有别名 `GET /responses/{response_id}/input_items`）
- `GET /v1/responses/{response_id}`（也有别名 `GET /responses/{response_id}`）
- `DELETE /v1/responses/{response_id}`（也有别名 `DELETE /responses/{response_id}`）
- `POST /v1/responses/{response_id}/cancel`（也有别名 `POST /responses/{response_id}/cancel`）
- `GET /v1/responses/{response_id}/input_items`（也有别名 `GET /responses/{response_id}/input_items`）

```bash
curl -sS -X POST "$BASE_URL/v1/responses" \
  -H "Authorization: Bearer $SUB2API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5",
    "input": "hello"
  }'
```

兼容提醒（工具调用/多轮续写）：

- 如果你发送 `function_call_output`：要么带 `previous_response_id`，要么在 `input` 里带足 `tool_call` 上下文。
- 需要依赖上游历史时：建议 `store=true` 并复用 `previous_response_id`。

---

## 5. Gemini（`/v1beta/*`）

### 5.1 模型列表

`GET /v1beta/models`

```bash
curl -sS "$BASE_URL/v1beta/models" \
  -H "Authorization: Bearer $SUB2API_KEY"
```

### 5.2 generateContent（非流式）

```bash
curl -sS -X POST "$BASE_URL/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "Authorization: Bearer $SUB2API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {"role": "user", "parts": [{"text": "hello"}]}
    ],
    "generationConfig": {"maxOutputTokens": 128}
  }'
```

### 5.3 流式（SSE）

把接口换成 `streamGenerateContent`，并加 `?alt=sse`：

```bash
curl -N -X POST "$BASE_URL/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse" \
  -H "Authorization: Bearer $SUB2API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {"role": "user", "parts": [{"text": "hello"}]}
    ],
    "generationConfig": {"maxOutputTokens": 128}
  }'
```

### 5.4 API Key 位置（Gemini 兼容）

Gemini 相关接口除了 `Authorization` 外，也支持：

- `x-goog-api-key: <SUB2API_KEY>`

（可选）也支持 URL Query `?key=<SUB2API_KEY>`，但需要管理员开启 `gateway.allow_google_query_key`。

---

## 6. Antigravity（专用前缀）

当你需要 **“只用 Antigravity 账号”**，把 base URL 换成带前缀的：

- Claude：`BASE_URL/antigravity/v1/messages`
- Gemini：`BASE_URL/antigravity/v1beta/...`

Claude Code 示例：

```bash
export ANTHROPIC_BASE_URL="$BASE_URL/antigravity"
export ANTHROPIC_AUTH_TOKEN="$SUB2API_KEY"
```

---

## 7. 常见报错（快速对照）

- `401 API key is required / Invalid API key`：没带 key 或 key 不对
- `403 Insufficient account balance`：余额不足（或订阅未开通/已过期）
- `429 Rate Limit / quota limit exceeded`：限流/配额触发
- `5xx`：上游/网络/账号不可用，可稍后重试或联系管理员
