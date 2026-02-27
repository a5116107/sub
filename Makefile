.PHONY: \
	build build-backend build-frontend build-frontend-v2 \
	test test-backend test-frontend test-frontend-v2 \
	verify-embed-assets build-embed-assets

# Build backend + both embedded frontends
build: build-backend build-frontend build-frontend-v2

# Build backend (delegates to backend/Makefile)
build-backend:
	@$(MAKE) -C backend build

# Build frontend v1 (Vue)
build-frontend:
	@pnpm --dir frontend run build

# Build frontend v2 (React, outputs to backend/internal/web/dist-v2)
build-frontend-v2:
	@pnpm --dir web-app-v run build

# Verify embedded frontend asset references in dist/dist-v2
verify-embed-assets:
	@node tools/verify-embed-assets.mjs

# Build both frontends then verify embed integrity
build-embed-assets: build-frontend build-frontend-v2 verify-embed-assets

# Run backend + frontend checks
test: test-backend test-frontend test-frontend-v2

test-backend:
	@$(MAKE) -C backend test

test-frontend:
	@pnpm --dir frontend run lint:check
	@pnpm --dir frontend run typecheck
	@pnpm --dir frontend run test:run

test-frontend-v2:
	@pnpm --dir web-app-v run lint
	@pnpm --dir web-app-v run build
