# Food Delivery Web

Phase 4 Next.js App Router frontend for the local Food Delivery Observability stack.

## Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm storybook
pnpm playwright
```

From the repo root, use `pnpm dev:web`, `pnpm build:web`, `pnpm test:web`, `pnpm storybook`, and `pnpm playwright`.

## Architecture

- `src/app`: App Router pages, loading, not-found, global-error, and `/api/backend` proxy.
- `src/features`: customer, restaurant, rider, checkout, cart, orders, profile, auth, and landing feature code.
- `src/lib/api`: typed fetch client, repositories, query keys, and error normalization.
- `src/stores`: Zustand stores for cart/session-style UI state.
- `src/components`: layout, shared components, and shadcn-style UI primitives.

The browser uses `/api/backend` by default. Docker sets `API_BASE_URL=http://api:4000` so the Next proxy reaches the API on the internal Compose network.
