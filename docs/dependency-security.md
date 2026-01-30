# Dependency & Supply-Chain Security

This document is the SSOT for dependency/audit posture and any approved exceptions.

## Backend (Go)

- Run tests: `cd backend; go test ./...`
- Run vuln scan: `cd backend; govulncheck ./...`

## Frontend (pnpm) audit + exceptions

High/Critical findings must be either fixed or explicitly recorded in `.github/audit-exceptions.yml`
with an owner + expiry.

Recommended flow:

1. Generate audit JSON:
   - PowerShell: `pnpm -C frontend audit --json | Out-File -Encoding utf8 code-reviews/pnpm-audit-frontend.json` (Windows PowerShell 5.1 会写入 UTF-8 BOM；校验脚本已兼容)
   - Bash: `pnpm -C frontend audit --json > code-reviews/pnpm-audit-frontend.json`
2. Validate exceptions (fails if high/critical is missing or expired):
   - `python tools/check_pnpm_audit_exceptions.py --audit code-reviews/pnpm-audit-frontend.json --exceptions .github/audit-exceptions.yml`

Notes:

- `.github/audit-exceptions.yml` currently contains the approved `xlsx` (SheetJS) high advisories.
- Keep exceptions time-bounded (`expires_on`) and re-evaluate before expiry.

## Remote content fetches (OpenCode Codex header)

The gateway contains an optional runtime fetch of OpenCode Codex header content from GitHub:

- Default: **disabled**
- Enable via env var: `SUB2API_OPENCODE_FETCH_ENABLED=1` (truthy values also supported: `true/yes/on/...`)

Security guidance:

- Treat this as a supply-chain / availability dependency. Keep it disabled in production unless you
  explicitly accept the risk.
- If you must enable it, prefer hosting a trusted mirror and controlling access (and keep outbound
  egress restricted).
- The implementation already includes cache + ETag, timeout, singleflight, and a strict max-size cap
  to reduce blast radius.

## Proxy probe external dependency

Proxy exit probing hits a third-party IP info endpoint for display purposes only:

- Default: `https://ip-api.com/json/?lang=zh-CN`
- Override via config/env: `SECURITY_PROXY_PROBE_IP_INFO_URL`

Use HTTPS endpoints and avoid using the result for security-critical decisions.
