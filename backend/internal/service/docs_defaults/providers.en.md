# Providers / Channels (plain-language guide)

This page answers:

1. Which endpoint should I call (`/v1/messages` / `/v1/chat/completions` / `/v1beta/...`)?
2. How do I pass my API key (which header)?
3. What’s different across providers (Claude / OpenAI / Gemini / Qwen / iFlow / Antigravity)?

---

## 0. What you need

- `BASE_URL`: your Sub2API site URL  
  e.g. `https://sub2api.example.com`
- `SUB2API_KEY`: the downstream API key issued by Sub2API (often starts with `sk-`)

### How to pass the API key

Recommended:

- `Authorization: Bearer <SUB2API_KEY>`

Also supported:

- `x-api-key: <SUB2API_KEY>`
- `x-goog-api-key: <SUB2API_KEY>` (mainly for Gemini SDK/CLI compatibility)

Not recommended (deprecated / may be disabled):

- URL Query: `?key=...` / `?api_key=...`

---

## 1. Three API families

| Your client/SDK | Use | Typical endpoint |
|---|---|---|
| Claude/Anthropic ecosystem (Claude Code, Anthropic SDK) | Anthropic Messages | `POST /v1/messages` |
| OpenAI ecosystem (OpenAI-compatible clients) | OpenAI Chat Completions | `POST /v1/chat/completions` |
| Gemini ecosystem (Gemini SDK/CLI) | Gemini v1beta | `POST /v1beta/models/{model}:generateContent` |

---

## 2. Path prefixes: default / Antigravity / provider aliases

Default (use `BASE_URL` directly):

- Claude: `BASE_URL/v1/messages`
- OpenAI: `BASE_URL/v1/chat/completions`
- Gemini: `BASE_URL/v1beta/...`

Antigravity-only (do **not** mix with other accounts):

- Claude: `BASE_URL/antigravity/v1/messages`
- Gemini: `BASE_URL/antigravity/v1beta/...`

Provider aliases (useful for some tools that expect provider prefixes):

- `BASE_URL/api/provider/openai/...`
- `BASE_URL/api/provider/anthropic/...`
- `BASE_URL/api/provider/gemini/...` or `BASE_URL/api/provider/google/...`

---

## 3. Claude / Anthropic (`/v1/messages`)

### Non-streaming

```bash
curl -sS -X POST "$BASE_URL/v1/messages" \
  -H "Authorization: Bearer $SUB2API_KEY" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 128,
    "messages": [{"role": "user", "content": "Say hello in one word."}]
  }'
```

Common fields: `model`, `messages`, `max_tokens`, optional `stream`, `temperature`, `system`, `tools`.

### Streaming (SSE)

```bash
curl -N -X POST "$BASE_URL/v1/messages" \
  -H "Authorization: Bearer $SUB2API_KEY" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 128,
    "stream": true,
    "messages": [{"role": "user", "content": "hello"}]
  }'
```

Other useful endpoints:

- `POST /v1/messages/count_tokens`
- `GET /v1/models` (models allowed by your API key group)
- `GET /v1/usage`

---

## 4. OpenAI / Qwen / iFlow (`/v1/chat/completions`)

### Chat Completions (recommended)

```bash
curl -sS -X POST "$BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $SUB2API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "hello"}],
    "stream": false
  }'
```

Which provider is used depends on **your API key’s group** (platform, allowed models, billing rules). You don’t need to put `qwen/iflow` in the URL.

### OpenAI Responses (OpenAI groups only)

- `POST /v1/responses` (also `POST /responses`)
- `POST /v1/responses/compact` (also `POST /responses/compact`)
- `POST /v1/responses/input_tokens` (also `POST /responses/input_tokens`)
- `GET /v1/responses/{response_id}` (also `GET /responses/{response_id}`)
- `DELETE /v1/responses/{response_id}` (also `DELETE /responses/{response_id}`)
- `POST /v1/responses/{response_id}/cancel` (also `POST /responses/{response_id}/cancel`)
- `GET /v1/responses/{response_id}/input_items` (also `GET /responses/{response_id}/input_items`)
- `GET /v1/responses/{response_id}` (also `GET /responses/{response_id}`)
- `DELETE /v1/responses/{response_id}` (also `DELETE /responses/{response_id}`)
- `POST /v1/responses/{response_id}/cancel` (also `POST /responses/{response_id}/cancel`)
- `GET /v1/responses/{response_id}/input_items` (also `GET /responses/{response_id}/input_items`)

```bash
curl -sS -X POST "$BASE_URL/v1/responses" \
  -H "Authorization: Bearer $SUB2API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5",
    "input": "hello"
  }'
```

Tool continuation note: `function_call_output` requires `previous_response_id` or proper tool call context.

---

## 5. Gemini (`/v1beta/*`)

### List models

```bash
curl -sS "$BASE_URL/v1beta/models" \
  -H "Authorization: Bearer $SUB2API_KEY"
```

### generateContent

```bash
curl -sS -X POST "$BASE_URL/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "Authorization: Bearer $SUB2API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"role": "user", "parts": [{"text": "hello"}]}],
    "generationConfig": {"maxOutputTokens": 128}
  }'
```

### Streaming (SSE)

```bash
curl -N -X POST "$BASE_URL/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse" \
  -H "Authorization: Bearer $SUB2API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"role": "user", "parts": [{"text": "hello"}]}],
    "generationConfig": {"maxOutputTokens": 128}
  }'
```

Gemini auth headers also accept `x-goog-api-key`. Query `?key=` requires `gateway.allow_google_query_key`.

---

## 6. Antigravity (dedicated prefix)

Use these when you want **Antigravity-only** routing:

- Claude: `BASE_URL/antigravity/v1/messages`
- Gemini: `BASE_URL/antigravity/v1beta/...`

Claude Code example:

```bash
export ANTHROPIC_BASE_URL="$BASE_URL/antigravity"
export ANTHROPIC_AUTH_TOKEN="$SUB2API_KEY"
```

---

## 7. Common errors

- `401`: missing/invalid API key
- `403`: insufficient balance / no active subscription / group disabled
- `429`: rate limit / quota exceeded
- `5xx`: upstream/network/account issues (retry later or contact admin)
