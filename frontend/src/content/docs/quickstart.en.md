# Quickstart

Goal: complete the loop **(create user key → send one request)** in minutes.

## 1) Deploy and open the admin UI

Deploy via Docker / binary / install script, then open the admin UI (default port is usually `8080`).

## 2) Add upstream accounts (Admin)

Create/import upstream accounts (OAuth or API key) in the admin panel.

## 3) Create a user API key (User)

Sign in as a user and create an API key in **API Keys**.

## 4) Send a request (example)

Anthropic-compatible example with `/v1/messages`:

```bash
export SUB2API_BASE="http://YOUR_DOMAIN:8080"
export SUB2API_KEY="sk-xxxxx"

curl -X POST "$SUB2API_BASE/v1/messages" \
  -H "Authorization: Bearer $SUB2API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-5-haiku-latest","messages":[{"role":"user","content":"Hello!"}]}'
```

## 5) Keep docs on the same domain

- Admin → Settings → Site → set `doc_url` to `/docs`
- Edit docs in-repo: `frontend/src/content/docs/*.md`

