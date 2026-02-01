# 兼容性（Compatibility）

本文列出 Sub2API 网关的主要对外接口（以当前实现为准）。

## Anthropic-compatible（Claude 风格）

Base: `/v1`

- `POST /v1/messages`
- `POST /v1/messages/count_tokens`
- `GET /v1/models`
- `GET /v1/usage`

## OpenAI-compatible（Chat Completions / Completions / Responses）

Base: `/v1`

- `POST /v1/chat/completions`
- `POST /v1/completions`
- `POST /v1/responses`

别名：

- `POST /responses`（不带 `/v1` 前缀）

## Gemini 原生（v1beta / CLI）

Base: `/v1beta`

- `GET /v1beta/models`
- `GET /v1beta/models/:model`
- `POST /v1beta/models/*modelAction`（用于 `{model}:{action}` 形式）

Gemini CLI v1internal：

- `POST /v1internal:method`

## Provider 路由别名（Amp-style）

在部分客户端/集成场景中，可使用 `/api/provider/<name>/...` 形式：

- OpenAI：`/api/provider/openai/...`
- Anthropic：`/api/provider/anthropic/...`
- Gemini：`/api/provider/gemini/...`
- Google（Gemini 的别名）：`/api/provider/google/...`

示例：

- `/api/provider/openai/v1/chat/completions`
- `/api/provider/anthropic/v1/messages`
- `/api/provider/google/v1beta/models/*`

## Antigravity（隔离调度）

- `GET /antigravity/models`
- `POST /antigravity/v1/messages`
- `POST /antigravity/v1/messages/count_tokens`
- `GET /antigravity/v1/models`
- `GET /antigravity/v1/usage`
- `/antigravity/v1beta/models/*`（Gemini v1beta 兼容）

