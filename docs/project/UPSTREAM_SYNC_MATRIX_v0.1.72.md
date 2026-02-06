# Upstream Sync Matrix (`fork/main` -> `origin/main@v0.1.72`)

## Baseline (2026-02-06)

- Divergence: `fork/main...origin/main = ahead 16 / behind 187`
- Latest reachable tag:
  - fork: `v0.1.65`
  - upstream: `v0.1.72`
- Missing upstream tags on fork: `v0.1.66`, `v0.1.69`, `v0.1.70`, `v0.1.71`, `v0.1.72`
- Dry-run merge conflicts (content): `60` files (hotspots: `backend/internal/service`, `backend/internal/handler`, `backend/internal/repository`, `frontend/src/views`)

## Strategy

- Do **feature-level reimplementation** on fork codebase (not direct full merge).
- Preserve existing behavior first, then selectively absorb upstream improvements.
- Run full backend regression after each batch.

## Batch Plan

### Batch 1 (Completed in this branch)

Goal: gateway/auth compatibility hardening with low blast radius.

Absorbed upstream intent:

1. `9985c4a3` (Gemini auth compatibility, `Authorization: Bearer`)
2. `f33a9501` (map `cached_tokens` -> `cache_read_input_tokens`)
3. `9a48b2e9` (OAuth instructions handling for Codex CLI/non-CLI)
4. `fecfaae8` (strip unsupported OpenAI fields from upstream requests)

Local implementation files:

- `backend/internal/server/middleware/api_key_auth_google.go`
- `backend/internal/server/middleware/api_key_auth_google_test.go`
- `backend/internal/service/gateway_service.go`
- `backend/internal/service/gateway_cached_tokens_test.go`
- `backend/internal/service/openai_codex_transform.go`
- `backend/internal/service/openai_codex_transform_test.go`
- `backend/internal/service/openai_gateway_service.go`
- `backend/internal/service/openai_gateway_service_test.go`

Validation:

- `go test ./internal/server/middleware -run "Google|ExtractAPIKeyForGoogle" -count=1`
- `go test ./internal/service -run "CodexOAuthTransform|IsInstructionsEmpty|StripUnsupportedOpenAIRequestFields|CachedTokens|ParseSSEUsage" -count=1`
- `go test ./...` (backend full pass)

### Batch 2 (Recommended Next)

Goal: gateway tool-call/thinking compatibility and retry correctness.

Candidate upstream commits/features:

- `d182ef03` / `05af95da`: tool-name rewrite regression fixes
- `ad90bb46`: thinking block mutation safety
- `8f397548`: model prefix mapping fix
- `fa3ea5ee` / `c441638f`: `/v1/usage` behavior alignment

### Batch 3 (Recommended Next)

Goal: account/admin productivity features.

Candidate upstream commits/features:

- `b4bd46d0` + `ce9a247a` + `0c660f83` + `0b45d48e` + `37047919`: import/export bundle
- `39e05a2d`: global error passthrough rules
- `e1a4a7b8`: copy accounts across groups

### Batch 4 (Optional / Controlled)

Goal: auth/session model and protocol evolution.

Candidate upstream commits/features:

- `49a3c437`: refresh token mechanism
- `39a0359d` / `97a5c1ac`: h2c support
- antigravity tuning group (retry/cooldown/routing mapping)

