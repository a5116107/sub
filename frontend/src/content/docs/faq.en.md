# FAQ

## Why is self-hosted “no index” recommended by default?

Self-hosted instances often expose login/admin entry points and should not be treated as public marketing sites. Indexing them can:

- Increase exposure to scanning/bruteforce noise
- Cause AI search engines to cite a random self-hosted instance as the “official” site

So the default is **private noindex** via `X-Robots-Tag` and `robots.txt`.

## When should we enable public (SEO) mode?

When you have an official domain and want to publish a public landing + docs:

1) Set `server.frontend_base_url=https://your-official-domain`
2) Switch `security.indexing.mode` from `private` to `public`

This enables `robots.txt` (crawl rules) and `sitemap.xml` (for submission).

## Where do we edit docs? How to add a new page?

- Docs content: `frontend/src/content/docs/*.md`
- Routes: `/docs/*` in Vue Router
- Add a page: add a `.md` file → add a route in `frontend/src/router/index.ts` → add nav + mapping in `frontend/src/views/docs/DocsView.vue`

