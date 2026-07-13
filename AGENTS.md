# AGENTS.md

## Project Summary

`food-delivery-observability` is a local Docker-based learning project for a production-like food delivery backend with complete local observability. The repository is now a lightweight pnpm monorepo.

## Current Phase

Phase 3 backend expansion is implemented in `apps/api`. Phase 4 frontend work is intentionally deferred; `apps/web` is only a placeholder.

## Tech Stack

- pnpm workspaces
- Node.js LTS
- NestJS
- TypeScript
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
│       └── README.md
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
- NestJS, Prisma, Jest, TypeScript, and ESLint API config belong in `apps/api`.
- Observability and database infrastructure config belongs in `infrastructure`.
- Do not import NestJS, Prisma-generated types, or React into future shared contract packages.
- Do not scaffold Next.js or implement frontend business features until Phase 4 is explicitly requested.

## Commands

Root workspace commands:

```bash
pnpm install
pnpm prisma:generate
pnpm dev:api
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm test:cov
pnpm test:e2e
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

Helper commands:

```bash
source ./skills.sh
skill_info
skill_workspace
skill_verify_workspace
skill_verify
skill_verify_observability
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
- Do not add authentication, payments, BullMQ, rider, notification, or frontend changes unless the requested phase includes them. Phase 3 already includes these backend capabilities; avoid unrelated expansion.
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
- The API image must be able to access `pnpm-lock.yaml`, `pnpm-workspace.yaml`, root `package.json`, and `apps/api/package.json`.
- Infrastructure mounts must point to `infrastructure/*`.
- Do not copy local `node_modules`, coverage, or build output into Docker images.
- The API container runs migrations and seed data on startup for one-command local setup.

## Testing Expectations

- Configure and use Jest.
- Unit-test service-layer business logic.
- Unit-test logging, metrics, and tracing helpers.
- Use Supertest for endpoint integration tests.
- Use the separate `food_delivery_test` PostgreSQL database for e2e tests.
- Mock external dependencies in unit tests.
- Generate coverage with `pnpm test:cov`.
- Do not reduce existing coverage thresholds.
- Run lint, typecheck, tests, and build after meaningful code changes.

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
The repository has been refactored into a lightweight pnpm monorepo. The NestJS API now lives under `apps/api`, observability and database infrastructure configuration now lives under `infrastructure`, root package scripts orchestrate workspace commands, and `apps/web` is a Phase 4 placeholder only. No frontend features were implemented.

Repository restructuring completed:
- Moved `src`, `test`, `prisma`, `Dockerfile`, `nest-cli.json`, `prisma.config.ts`, `tsconfig.json`, and `tsconfig.build.json` into `apps/api`.
- Moved API-specific Jest config into `apps/api/package.json`.
- Moved API ESLint config to `apps/api/eslint.config.mjs`.
- Moved `alloy`, `grafana`, `loki`, `prometheus`, and `tempo` into `infrastructure`.
- Moved `docker/postgres/init-test-db.sql` to `infrastructure/postgres/init-test-db.sql` and removed the redundant `docker` directory.
- Added `pnpm-workspace.yaml` with `apps/*` and `packages/*`.
- Added `apps/web/README.md` as a Phase 4 placeholder.
- Added `apps/api/.env.example`.
- Did not create `packages/contracts`; contract extraction is deferred until there is a stable shared API surface.

Important path changes:
- API package: `apps/api/package.json`
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

Verification results after refactor:
- `pnpm install`: passed.
- `pnpm install --frozen-lockfile`: passed.
- `pnpm -r list --depth -1`: found root package and `@food-delivery/api`.
- `pnpm prisma:generate`: passed from root and generated Prisma Client from `apps/api/prisma/schema.prisma`.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm test`: passed, 10 suites and 22 tests.
- `pnpm verify`: passed.
- `pnpm test:cov --runInBand`: tests passed but command failed coverage thresholds with 41.09% statements, 42.81% branches, 36.68% functions, and 39.65% lines. This is the same known Phase 3 coverage gap from before the refactor.
- `docker compose config --quiet`: passed.
- `docker compose build`: passed.
- Default `docker compose up -d`: failed on this machine because host `localhost:5432` is already in use. This was a pre-existing local-machine issue.
- Temporary verification start passed with:
  `docker compose -f docker-compose.yml -f <(printf 'services:\n  postgres:\n    ports: !override\n      - "15432:5432"\n') up -d`
- API health check passed: `GET http://localhost:4000/health`.
- Metrics endpoint passed: `GET http://localhost:4000/metrics`.
- Prometheus API query for `up{job="food-delivery-api"}` returned `1`.
- Grafana health returned database `ok`.
- Grafana datasources and dashboards were provisioned from `infrastructure/grafana`.
- `source ./skills.sh; skill_verify`: passed, 5 passed and 0 failed.
- `source ./skills.sh; skill_verify_workspace`: passed, 9 passed and 0 failed.
- `source ./skills.sh; skill_verify_observability`: passed on rerun, 7 passed and 0 failed. The first run happened while Grafana datasource health was still returning startup 503s.
- Default `pnpm test:e2e`: failed on this machine at `localhost:5432` with a Prisma schema engine error, matching the known local PostgreSQL port conflict.
- `TEST_DATABASE_URL=postgresql://food_delivery:food_delivery@localhost:15432/food_delivery_test?schema=public pnpm test:e2e`: passed, 1 suite and 9 tests.
- `DATABASE_URL=postgresql://food_delivery:food_delivery@localhost:15432/food_delivery?schema=public pnpm prisma:migrate:deploy`: passed, no pending migrations.
- `DATABASE_URL=postgresql://food_delivery:food_delivery@localhost:15432/food_delivery?schema=public pnpm prisma:seed`: passed.
- Live smoke after clearing Redis passed: `GET /restaurants` returned 4 restaurants, seeded customer login worked, and `POST /orders` returned `PAYMENT_PENDING`.

Known issues:
- Coverage thresholds still fail until focused Phase 3 unit tests are added.
- The default Docker and e2e host PostgreSQL port `localhost:5432` is occupied on this machine. Use a temporary Compose override mapping Postgres to `15432:5432` for local verification, or stop the conflicting local PostgreSQL service.
- E2E tests still share Redis with the live stack when both are run together. Clear Redis after e2e or isolate/namespace cache keys to avoid live cache entries pointing at test database IDs.
- Phase 3 dashboard and alert expansion for auth, payment, queue, cache, rider, notification, and domain-event metrics is still pending.
- README still documents dashboard behavior but does not include real captured screenshots.

Important decisions:
- Root `package.json` has no application dependencies.
- `apps/api/package.json` owns API runtime dependencies and API tooling.
- The Docker API image uses the monorepo root as build context and runs from `/repo/apps/api`.
- `apps/web` contains only documentation for the future Phase 4 Next.js app.
- `packages/contracts` was not created to avoid placeholder package churn and backend DTO rewrites.
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

If `localhost:5432` is occupied on this machine, use a temporary override for verification:

```bash
docker compose -f docker-compose.yml -f <(printf 'services:\n  postgres:\n    ports: !override\n      - "15432:5432"\n') up -d
```

Phase 4 readiness:
`apps/web/README.md` reserves the web app location and documents that the future frontend should use Next.js. No frontend package or business functionality exists yet.

Next recommended task:
Close remaining Phase 3 Definition of Done gaps: add focused unit tests until coverage passes, isolate Redis/cache state for e2e tests, and expand Grafana dashboards plus Prometheus alerts for Phase 3 metric families. Start Phase 4 only after those backend/observability gaps are accepted or explicitly deferred.

Last updated:
2026-07-13 23:18 PHT/UTC+08

At the end of every major task, update this Context Handoff section so the next agent can continue without reading the full conversation.

## Definition Of Done

- The repository is a valid pnpm workspace.
- The NestJS API lives under `apps/api`.
- Observability configuration lives under `infrastructure`.
- The root directory stays clean and understandable.
- Root and API dependencies are correctly separated.
- `docker compose up --build` starts all services when required host ports are free.
- `GET http://localhost:4000/health` works.
- `GET http://localhost:4000/restaurants` returns seeded restaurants and menu items.
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
- Unit tests, e2e tests with a valid test database URL, lint, typecheck, and build pass.
- Coverage passes once the known Phase 3 coverage gap is closed.
