# Overview

Sub2API is a **self-hosted AI API gateway** that unifies multiple upstream accounts (subscription/OAuth/API key) behind a single API surface, with quota distribution, API key management, billing, and traffic controls.

## Who is it for?

- Teams that need to distribute upstream quota safely
- Operators who want unified API keys, groups, rate limits, concurrency control, and usage auditing
- Builders who want standard, stable gateway endpoints without exposing upstream credentials

## Security boundary (important)

- **Least exposure**: regular APIs/pages should not reveal upstream credentials or internal routing details.
- **Admin-only sensitive operations**: sensitive data is only accessible via admin flows.
- **Default no-index for self-hosted**: private deployments should not be indexed by search engines/AI search by default.

