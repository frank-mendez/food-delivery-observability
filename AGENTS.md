# AGENTS.md

## Project Summary

`food-delivery-observability` is a local Docker-based learning project for a production-like food delivery platform with a Next.js frontend, NestJS backend, and complete local observability. The repository is a lightweight pnpm monorepo.

## Current Phase

Phase 4 frontend implementation is complete in `apps/web`. The NestJS backend remains in `apps/api`, and the Docker observability stack remains under `infrastructure`.

## Tech Stack

- pnpm workspaces
- Node.js LTS
- Next.js App Router
- NestJS
- TypeScript
- Tailwind CSS
- shadcn-style UI primitives
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Storybook
- Vitest
- React Testing Library
- Playwright
- Lucide Icons
- Framer Motion
- PostgreSQL
- Prisma ORM
- Redis
- BullMQ
- Docker Compose
- Prometheus
- Grafana
- Grafana Alloy
- Loki
- Tempo
- OpenTelemetry
- cAdvisor
- Jest and Supertest

## Monorepo Structure

```text
.
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   ├── src/
│   │   ├── test/
│   │   ├── Dockerfile
│   │   ├── eslint.config.mjs
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   ├── prisma.config.ts
│   │   ├── tsconfig.json
│   │   └── tsconfig.build.json
│   └── web/
│       ├── .storybook/
│       ├── e2e/
│       ├── public/
│       ├── src/
│       ├── Dockerfile
│       ├── package.json
│       ├── playwright.config.ts
│       ├── tsconfig.json
│       └── vitest.config.ts
├── infrastructure/
│   ├── alloy/
│   ├── grafana/
│   ├── loki/
│   ├── postgres/
│   ├── prometheus/
│   └── tempo/
├── postman/
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── README.md
├── AGENTS.md
└── skills.sh
```

Do not create empty architecture folders. `packages/contracts` is deferred until stable framework-neutral contracts are worth sharing.

## Package Boundaries

- Root `package.json` is an orchestrator only.
- API runtime and development dependencies belong in `apps/api/package.json`.
- Web runtime and development dependencies belong in `apps/web/package.json`.
- NestJS, Prisma, Jest, TypeScript, and ESLint API config belong in `apps/api`.
- Next.js, React, Storybook, Vitest, Playwright, Tailwind, and frontend ESLint config belong in `apps/web`.
- Observability and database infrastructure config belongs in `infrastructure`.
- Do not import NestJS, Prisma-generated types, or React into future shared contract packages.
- Keep frontend business features in `apps/web`; do not rewrite backend code for UI-only work unless a minimal API change is explicitly required.

## Commands

Root workspace commands:

```bash
pnpm install
pnpm prisma:generate
pnpm dev
pnpm dev:api
pnpm dev:web
pnpm lint
pnpm lint:api
pnpm lint:web
pnpm typecheck
pnpm typecheck:api
pnpm typecheck:web
pnpm build
pnpm build:api
pnpm build:web
pnpm test
pnpm test:api
pnpm test:web
pnpm test:cov
pnpm test:cov:web
pnpm test:e2e
pnpm playwright
pnpm storybook
pnpm build-storybook
pnpm verify
pnpm docker:build
pnpm docker:up
pnpm docker:down
pnpm docker:logs
```

API-local commands:

```bash
cd apps/api
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:cov
pnpm test:e2e
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:migrate:deploy
pnpm prisma:seed
```

Web-local commands:

```bash
cd apps/web
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm storybook
pnpm build-storybook
pnpm playwright
```

Helper commands:

```bash
source ./skills.sh
skill_info
skill_workspace
skill_ports
skill_check_ports
skill_verify_ports
skill_verify_workspace
skill_verify
skill_verify_observability
skill_web
skill_storybook
skill_build_web
skill_test_web
skill_playwright
skill_verify_web
skill_metrics
skill_trace
skill_dashboards
```

## Coding Conventions

- Use clean, boring, production-style code.
- Prefer explicit names over clever abstractions.
- Keep controllers thin and put business logic in services.
- Use Prisma for database access.
- Validate request bodies with DTOs and Nest validation pipes.
- Frontend uses Feature First Architecture under `apps/web/src/features`.
- Keep browser-facing API calls in `apps/web/src/lib/api` repositories and feature hooks. Do not put raw `fetch` calls in UI components.
- Use TanStack Query for server state.
- Use Zustand only for cart, role/session, sidebar, theme, and filter state.
- Use React Hook Form and Zod for checkout, profile, menu, and future form validation.
- The development role switcher is local/demo-only. Do not present it as production authentication.
- Do not add authentication, payments, BullMQ, rider, notification, or frontend/backend scope outside the requested phase. Phase 3 already includes these backend capabilities and Phase 4 includes the frontend.
- Do not add Turborepo, Nx, Kubernetes, micro-frontends, or extra package abstractions.

## Observability Rules

- Keep `/metrics` Prometheus-compatible.
- Keep metric names stable unless a migration note is added here.
- Prefer low-cardinality labels.
- Do not add user ids, order ids, restaurant ids, or menu item ids as metric labels.
- Track HTTP request count, duration, response status codes, and active requests.
- Track successful and failed order creation separately.
- Track order value and order creation duration.
- Track health check count.
- Track database query duration, database status, and PostgreSQL pool usage.
- Track Redis status, operation latency, and cache behavior.
- Use structured JSON logs through the shared logger, not `console.*`.
- Include requestId, correlationId, traceId, and spanId in request logs.
- Export traces to Tempo through Alloy using OTLP.

## Docker Rules

- Keep `docker-compose.yml` at the root.
- The API build context is the monorepo root and the Dockerfile path is `apps/api/Dockerfile`.
- The web build context is the monorepo root and the Dockerfile path is `apps/web/Dockerfile`.
- The API image must be able to access `pnpm-lock.yaml`, `pnpm-workspace.yaml`, root `package.json`, and `apps/api/package.json`.
- The web image must be able to access `pnpm-lock.yaml`, `pnpm-workspace.yaml`, root `package.json`, and `apps/web/package.json`.
- Infrastructure mounts must point to `infrastructure/*`.
- Do not copy local `node_modules`, coverage, or build output into Docker images.
- The API container runs migrations and seed data on startup for one-command local setup.
- The web container runs Next.js standalone output and reaches the API through internal `API_BASE_URL=http://api:4000` by default.

## Host Port Configuration Rules

- Published Docker host ports must be configurable with root `.env` variables and defaults in `docker-compose.yml`.
- Keep Docker-internal service ports stable and standard: PostgreSQL `5432`, Redis `6379`, API `4000`, Web `3001`, Prometheus `9090`, Grafana `3000`, Loki `3100`, Tempo `3200`, Alloy UI `12345`, Alloy OTLP `4317`/`4318`, and cAdvisor `8080`.
- Do not hard-code machine-specific alternate host ports in Compose files or docs.
- Do not use host-port overrides for container-to-container communication.
- Internal service URLs must keep Docker service names and container ports, such as `postgres:5432`, `redis:6379`, `api:4000`, `loki:3100`, `tempo:3200`, and `alloy:4318`.
- Use host-port variables only for published localhost access, such as `POSTGRES_HOST_PORT`, `REDIS_HOST_PORT`, `API_HOST_PORT`, `WEB_HOST_PORT`, `GRAFANA_HOST_PORT`, `PROMETHEUS_HOST_PORT`, `LOKI_HOST_PORT`, `TEMPO_HOST_PORT`, `ALLOY_HOST_PORT`, `ALLOY_OTLP_GRPC_HOST_PORT`, `ALLOY_OTLP_HTTP_HOST_PORT`, and `CADVISOR_HOST_PORT`.
- Verify port configuration with `source ./skills.sh; skill_ports`, `skill_check_ports`, and `skill_verify_ports`.

## Testing Expectations

- Configure and use Jest.
- Configure and use Vitest plus React Testing Library for frontend unit/component tests.
- Configure and use Playwright for frontend browser flows.
- Unit-test service-layer business logic.
- Unit-test logging, metrics, and tracing helpers.
- Unit-test frontend stores, schemas, reusable components, role switching, cart behavior, checkout validation, and order view helpers.
- Use Supertest for endpoint integration tests.
- Use the separate `food_delivery_test` PostgreSQL database for e2e tests.
- Mock external dependencies in unit tests.
- Generate coverage with `pnpm test:cov`.
- Keep web coverage at 80% or higher through `pnpm test:web`.
- Do not reduce existing coverage thresholds.
- Run lint, typecheck, tests, build, and relevant Playwright/Docker checks after meaningful code changes.

## Generated Directory Rules

Ignore and avoid committing:

- `node_modules` and `**/node_modules`
- `dist` and `**/dist`
- `coverage` and `**/coverage`
- `.next` and `**/.next`
- test reports and Playwright output
- local telemetry data
- temporary logs
- local `.env` files except checked-in examples

## Token-Saving Rules

- Before editing, inspect only the files needed for the task.
- Prefer targeted file reads instead of scanning the whole repo.
- Do not rewrite large files unless necessary.
- Summarize findings before making broad changes.
- Avoid repeating full file contents in responses.
- Use concise commit-style summaries after changes.
- Keep explanations focused on what changed, why, and how to verify.
- When context gets long, update this handoff section.

## Agent Workflow

1. Read `AGENTS.md`.
2. Run `source ./skills.sh; skill_info`.
3. Run `source ./skills.sh; skill_verify` when the Docker stack is expected to be running.
4. Read only files relevant to the task.
5. Make focused changes.
6. Run lint, typecheck, tests, build, and relevant Docker/observability checks.
7. Update the Context Handoff section after significant work.
8. Summarize changes in commit-style bullets.

Workflow priorities:

- Minimize token usage.
- Avoid reading unrelated files.
- Reuse existing code before creating new abstractions.
- Keep architecture consistent.
- Leave the repository in a runnable state.
- Always update `AGENTS.md` after significant work.

## Context Handoff

Current status:
- The repository is a lightweight pnpm monorepo with `apps/api` for the NestJS backend, `apps/web` for the Phase 4 Next.js frontend, and `infrastructure` for Docker observability and database config.
- Phase 4 frontend is implemented and verified. It is no longer a placeholder.
- The web app is a Next.js App Router application using TypeScript, Tailwind CSS, shadcn-style primitives, TanStack Query, Zustand, React Hook Form, Zod, Storybook, Vitest, React Testing Library, Playwright, Lucide icons, and Framer Motion.

Phase 4 frontend completed:
- Customer flows: landing, restaurant listing, restaurant search/filtering, restaurant details, menu browsing, cart, checkout, order creation, order history, order tracking, and profile.
- Restaurant flows: portal dashboard, incoming/active order views, accept/reject/preparing/ready actions where backend support exists, menu listing/edit form, and analytics cards.
- Rider flows: available deliveries, accept/status actions where backend support exists, current delivery, and delivery history.
- Development-only role switcher persists the selected role locally and logs into seeded backend accounts.
- Shared app shell includes responsive desktop sidebar, mobile bottom navigation, theme toggle, cart badge, toasts, loading/error/empty states, and dark mode.
- API access is centralized under `apps/web/src/lib/api` repositories with query keys, typed fetch, request IDs, and error normalization. UI components do not perform raw fetches.
- Storybook stories cover button variants, restaurant cards, menu cards, metric cards, status badges, timelines, empty states, and error states.
- Vitest/RTL tests cover restaurant listing, cart store, checkout schema, role switcher, order view helpers, shared components, menu cards, order cards, profile schema, menu item schema, status badges, timelines, and session/cart stores.
- Playwright covers the customer browse/cart/checkout/order-tracking flow and development role switching on desktop and mobile.
- `apps/web/Dockerfile` builds Next standalone output. `docker-compose.yml` now includes a `web` service published at `${WEB_HOST_PORT:-3001}:3001`.
- Root scripts now include web commands: `dev:web`, `build:web`, `test:web`, `test:cov:web`, `lint:web`, `typecheck:web`, `storybook`, `build-storybook`, and `playwright`.
- `skills.sh` now reports Phase 4 and includes `skill_web`, `skill_storybook`, `skill_build_web`, `skill_test_web`, `skill_playwright`, and `skill_verify_web`.

Configurable host-port variables:
- `API_HOST_PORT=4000`
- `WEB_HOST_PORT=3001`
- `POSTGRES_HOST_PORT=5432`
- `REDIS_HOST_PORT=6379`
- `PROMETHEUS_HOST_PORT=9090`
- `GRAFANA_HOST_PORT=3000`
- `LOKI_HOST_PORT=3100`
- `TEMPO_HOST_PORT=3200`
- `ALLOY_HOST_PORT=12345`
- `ALLOY_OTLP_GRPC_HOST_PORT=4317`
- `ALLOY_OTLP_HTTP_HOST_PORT=4318`
- `CADVISOR_HOST_PORT=8081`

Internal networking confirmation:
- Web proxy target defaults to `API_BASE_URL=http://api:4000` in Docker.
- API database URL remains `postgres:5432`.
- API Redis config remains `REDIS_HOST=redis` and `REDIS_PORT=6379`.
- API trace export remains `http://alloy:4318`.
- Prometheus still scrapes `api:4000` and `cadvisor:8080`.
- Grafana datasources still use `prometheus:9090`, `loki:3100`, and `tempo:3200`.
- Health checks still use container-local/internal ports.

Important path changes:
- API package: `apps/api/package.json`
- Web package: `apps/web/package.json`
- Web source: `apps/web/src`
- Web routes: `apps/web/src/app`
- Web API client/repositories: `apps/web/src/lib/api`
- Web tests: `apps/web/src/**/tests` and `apps/web/e2e`
- Web Storybook: `apps/web/.storybook`
- Web Dockerfile: `apps/web/Dockerfile`
- Prisma schema: `apps/api/prisma/schema.prisma`
- Prisma migrations: `apps/api/prisma/migrations`
- API Dockerfile: `apps/api/Dockerfile`
- API source: `apps/api/src`
- API e2e tests: `apps/api/test`
- Prometheus config: `infrastructure/prometheus/prometheus.yml`
- Prometheus alerts: `infrastructure/prometheus/alert-rules.yml`
- Grafana provisioning and dashboards: `infrastructure/grafana`
- Alloy config: `infrastructure/alloy/config.alloy`
- Loki config: `infrastructure/loki/loki-config.yml`
- Tempo config: `infrastructure/tempo/tempo.yml`
- PostgreSQL test database init: `infrastructure/postgres/init-test-db.sql`

Verification results for Phase 4:
- Baseline before frontend work: `source ./skills.sh; skill_info` reported Phase 3; `skill_verify` passed 5/5; `skill_verify_workspace` passed 9/9.
- `pnpm install`: passed. The lockfile was already current; Prisma client generation was required afterward for API lint/type resolution.
- `pnpm prisma:generate`: passed.
- `pnpm lint`: passed for API and web.
- `pnpm typecheck`: passed for API and web.
- `pnpm build`: passed for API and web. Next produced routes for landing, restaurants, cart, checkout, orders, profile, restaurant portal, rider portal, and `/api/backend`.
- `pnpm test`: passed. API: 10 suites and 23 tests. Web: 13 files and 26 tests.
- `pnpm test:web`: passed with web coverage at 100% statements, 84.37% branches, 100% functions, and 100% lines.
- `pnpm playwright`: passed, 4 tests across desktop and mobile.
- `pnpm verify`: passed, including lint, typecheck, build, and tests.
- `docker compose build`: passed for API and web images.
- `docker compose up -d`: passed and started the new `food-delivery-web` container.
- `docker compose ps`: all services were up; web published `3001->3001`, Postgres published `15432->5432`, Redis published `16379->6379`.
- API health check passed: `GET http://localhost:4000/health` returned API, PostgreSQL, and Redis status `ok`.
- Web root check passed: `GET http://localhost:3001` returned HTTP 200.
- Live backend restaurant listing passed: `GET http://localhost:4000/restaurants` returned seeded restaurants and menu items.
- Live browser smoke test passed with `npx agent-browser`: restaurants loaded from the API, Northstar Burgers menu opened, Classic Cheeseburger was added to cart, checkout loaded customer profile data, order submission succeeded, and the order-tracking page rendered.
- Mobile responsive smoke test passed at 390x844 with clean compact header, restaurant list, and bottom navigation.
- `source ./skills.sh; skill_verify_workspace`: passed, 15 passed and 0 failed.
- `source ./skills.sh; skill_verify`: passed, 6 passed and 0 failed.
- `source ./skills.sh; skill_verify_web`: passed, 4 passed and 0 failed.
- `source ./skills.sh; skill_verify_ports`: passed, 28 passed and 0 failed.

Known issues:
- Root `pnpm test:cov` still targets API coverage only and remains the known Phase 3 coverage gap unless focused backend unit tests are added.
- The default host PostgreSQL port `localhost:5432` remains occupied on this machine. Use `.env` host-port overrides such as `POSTGRES_HOST_PORT=15432`.
- If overriding `POSTGRES_HOST_PORT` or `REDIS_HOST_PORT`, host-run API/e2e commands must mirror those localhost ports in `DATABASE_URL`, `TEST_DATABASE_URL`, or `REDIS_PORT`.
- E2E tests can still share Redis with the live stack when both are run together. Clear Redis after e2e or isolate/namespace cache keys to avoid live cache entries pointing at test database IDs.
- Alloy Docker log discovery currently sees all local Docker containers and hard-codes the project label during relabeling. Broad Loki queries such as `{project="food-delivery-observability",service="api"}` may include unrelated local containers; use `container="food-delivery-api"` for precise validation or scope Alloy discovery in a follow-up.
- Loki `/ready` returned 503 during this run even while log query ingestion worked. Tempo, Prometheus, Grafana health, and settled Grafana datasource checks passed.
- Phase 3 dashboard and alert expansion for auth, payment, queue, cache, rider, notification, and domain-event metrics is still pending.
- README still documents dashboard behavior but does not include real captured screenshots.
- Worktree note: `apps/api/src/restaurants/restaurants.controller.ts`, `restaurants.service.ts`, and `restaurants.service.spec.ts` were already modified before this Phase 4 frontend work. Do not revert them unless the user asks.

Important decisions:
- Root `package.json` has no application dependencies.
- `apps/api/package.json` owns API runtime dependencies and API tooling.
- `apps/web/package.json` owns frontend runtime dependencies and frontend tooling.
- The Docker API image uses the monorepo root as build context and runs from `/repo/apps/api`.
- The Docker web image uses the monorepo root as build context and runs Next standalone output from `/repo/apps/web/server.js`.
- `packages/contracts` was not created to avoid placeholder package churn and backend DTO rewrites.
- Frontend data access uses the Next proxy route `/api/backend` by default; Docker config points that proxy to `http://api:4000`.
- The role switcher remains development-only and uses the seeded backend accounts instead of fake auth state.
- Metrics keep the `food_delivery_` prefix and avoid high-cardinality labels.
- Logs may include operational fields, but metric labels must not include user/order/restaurant/menu item IDs.
- JWT access tokens default to 15 minutes and refresh tokens default to 7 days.
- Refresh tokens are stored only as bcrypt hashes and rotated on refresh.
- Restaurant/menu/order management is role-protected. Seeded restaurants are owned by `owner@example.com`.
- `DELETE /restaurants/:restaurantId/menu-items/:menuItemId` disables the item instead of physically deleting it.
- Order transitions are enforced by `apps/api/src/orders/order-status-transitions.ts`.
- Redis cache failures are logged as warnings and treated as cache misses.
- API logs are written to stdout as JSON, collected by Alloy, and sent to Loki.
- Traces are exported from the API to Alloy at `http://alloy:4318` and forwarded to Tempo.

How to run the app:

```bash
docker compose up --build
```

Open the web app at `http://localhost:3001` and the API at `http://localhost:4000`.

If a default host port is occupied, set overrides in the ignored root `.env` instead of editing Compose YAML:

```bash
POSTGRES_HOST_PORT=15432
REDIS_HOST_PORT=16379
```

Next recommended task:
- Improve the remaining Phase 3 backend gaps: add focused backend unit tests until root API coverage passes, scope Alloy Docker log discovery to this Compose project, isolate Redis/cache state for e2e tests, and expand Grafana dashboards plus Prometheus alerts for Phase 3 metric families.
- Optional Phase 4 follow-up: add visual regression snapshots or captured README screenshots now that the app is running.

Last updated:
2026-07-14 00:35 PHT/UTC+08

At the end of every major task, update this Context Handoff section so the next agent can continue without reading the full conversation.

## Definition Of Done

- The repository is a valid pnpm workspace.
- The NestJS API lives under `apps/api`.
- The Next.js frontend lives under `apps/web`.
- Observability configuration lives under `infrastructure`.
- The root directory stays clean and understandable.
- Root, API, and web dependencies are correctly separated.
- `docker compose up --build` starts all services when required host ports are free.
- `GET http://localhost:3001` serves the frontend.
- `GET http://localhost:4000/health` works.
- `GET http://localhost:4000/restaurants` returns seeded restaurants and menu items.
- The frontend can browse restaurants, view menus, add items to cart, check out, and show order tracking.
- The frontend includes restaurant portal and rider portal routes.
- The development role switcher persists locally and uses seeded backend accounts.
- Authenticated `POST http://localhost:4000/orders` creates a payment-pending order.
- `GET http://localhost:4000/metrics` exposes Prometheus metrics.
- Prometheus scrapes API and cAdvisor targets successfully.
- Loki receives structured API logs through Alloy.
- Tempo receives request traces through Alloy.
- Grafana starts with Prometheus, Loki, and Tempo datasources.
- Grafana dashboards are automatically provisioned.
- Prometheus alert rules load successfully.
- README explains setup, monorepo layout, endpoints, observability architecture, ports, metrics, logs, traces, dashboards, alerts, and troubleshooting.
- `AGENTS.md` includes token-saving rules and current context handoff.
- `skills.sh` is executable and documents reusable helper commands.
- API unit tests, API e2e tests with a valid test database URL, web unit/component tests, Playwright browser tests, lint, typecheck, and build pass.
- Web coverage remains at or above 80%.
- Coverage passes once the known Phase 3 coverage gap is closed.
