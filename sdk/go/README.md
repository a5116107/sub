# sub2api Go SDK (MVP)

This module provides a lightweight Go client for:

- Gateway APIs: OpenAI Chat Completions, Claude Messages, Gemini v1beta
- Admin APIs: groups/proxies/accounts CRUD (JWT bearer token)

## Install

```bash
go get github.com/Wei-Shaw/sub2api/sdk/go
```

## Quick start (examples)

```bash
cd examples/openai-chat
SUB2API_BASE_URL="https://your-host" \
SUB2API_API_KEY="sk-..." \
SUB2API_MODEL="gpt-4o-mini" \
go run .
```

Other examples:

- `examples/claude-messages`
- `examples/gemini-generate`

## Notes

- Gateway endpoints do **not** use the standard `{code,message,data}` envelope.
- Admin endpoints **do** use the envelope and require a JWT bearer token (typically obtained via `/api/v1/auth/login`).

