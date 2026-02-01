# Compatibility

This page lists the main gateway endpoints exposed by Sub2API (based on current implementation).

## Anthropic-compatible (Claude-style)

Base: `/v1`

- `POST /v1/messages`
- `POST /v1/messages/count_tokens`
- `GET /v1/models`
- `GET /v1/usage`

## OpenAI-compatible (Chat Completions / Completions / Responses)

Base: `/v1`

- `POST /v1/chat/completions`
- `POST /v1/completions`
- `POST /v1/responses`

Alias:

- `POST /responses` (without `/v1`)

## Gemini native (v1beta / CLI)

Base: `/v1beta`

- `GET /v1beta/models`
- `GET /v1beta/models/:model`
- `POST /v1beta/models/*modelAction` (for `{model}:{action}` style)

Gemini CLI v1internal:

- `POST /v1internal:method`

## Provider route aliases (Amp-style)

- OpenAI: `/api/provider/openai/...`
- Anthropic: `/api/provider/anthropic/...`
- Gemini: `/api/provider/gemini/...`
- Google (alias for Gemini): `/api/provider/google/...`

## Antigravity (isolated scheduling)

- `GET /antigravity/models`
- `POST /antigravity/v1/messages`
- `POST /antigravity/v1/messages/count_tokens`
- `GET /antigravity/v1/models`
- `GET /antigravity/v1/usage`
- `/antigravity/v1beta/models/*` (Gemini v1beta compatible)

