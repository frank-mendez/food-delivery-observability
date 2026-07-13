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

## Host Port Configuration Rules

- Published Docker host ports must be configurable with root `.env` variables and defaults in `docker-compose.yml`.
- Keep Docker-internal service ports stable and standard: PostgreSQL `5432`, Redis `6379`, API `4000`, Prometheus `9090`, Grafana `3000`, Loki `3100`, Tempo `3200`, Alloy UI `12345`, Alloy OTLP `4317`/`4318`, and cAdvisor `8080`.
- Do not hard-code machine-specific alternate host ports in Compose files or docs.
- Do not use host-port overrides for container-to-container communication.
- Internal service URLs must keep Docker service names and container ports, such as `postgres:5432`, `redis:6379`, `api:4000`, `loki:3100`, `tempo:3200`, and `alloy:4318`.
- Use host-port variables only for published localhost access, such as `POSTGRES_HOST_PORT`, `REDIS_HOST_PORT`, `API_HOST_PORT`, `GRAFANA_HOST_PORT`, `PROMETHEUS_HOST_PORT`, `LOKI_HOST_PORT`, `TEMPO_HOST_PORT`, `ALLOY_HOST_PORT`, `ALLOY_OTLP_GRPC_HOST_PORT`, `ALLOY_OTLP_HTTP_HOST_PORT`, and `CADVISOR_HOST_PORT`.
- Verify port configuration with `source ./skills.sh; skill_ports`, `skill_check_ports`, and `skill_verify_ports`.

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
The repository is a lightweight pnpm monorepo. The NestJS API lives under `apps/api`, observability and database infrastructure configuration lives under `infrastructure`, and `apps/web` is still only a Phase 4 placeholder. No frontend features have been scaffolded.

Port configurability work completed:
- `docker-compose.yml` now uses environment-variable defaults for every published host port while preserving stable container ports.
- Added host-port defaults to root `.env.example`.
- Updated `apps/api/.env.example` to clarify host-run API and e2e localhost ports.
- Updated `README.md` with Host Port Configuration, default mappings, override examples, and troubleshooting.
- Updated `skills.sh` with `skill_ports`, `skill_check_ports`, and `skill_verify_ports`.
- `skill_info`, `skill_verify`, and observability helper URLs now respect effective host ports from shell env or the ignored root `.env`.
- `skill_up` and `skill_rebuild` print port conflict warnings before starting Compose.

Configurable host-port variables:
- `API_HOST_PORT=4000`
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
- API database URL remains `postgres:5432`.
- API Redis config remains `REDIS_HOST=redis` and `REDIS_PORT=6379`.
- API trace export remains `http://alloy:4318`.
- Prometheus still scrapes `api:4000` and `cadvisor:8080`.
- Grafana datasources still use `prometheus:9090`, `loki:3100`, and `tempo:3200`.
- Health checks still use container-local/internal ports.

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

Verification results for port configurability:
- Baseline `source ./skills.sh; skill_verify_workspace`: passed, 9 passed and 0 failed.
- Baseline `source ./skills.sh; skill_verify`: failed because the stack was not running, 0 passed and 5 failed.
- Baseline port inspection showed `127.0.0.1:5432` already listening on this machine.
- `pnpm install`: passed.
- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm test`: passed, 10 suites and 22 tests.
- `docker compose --env-file /dev/null config`: resolved default Postgres `5432:5432` and Redis `6379:6379`.
- `source ./skills.sh; skill_check_ports` before startup with local `.env` overrides: passed, all configured host ports available.
- Active ignored local `.env` overrides used for runtime verification: `POSTGRES_HOST_PORT=15432` and `REDIS_HOST_PORT=16379`.
- `docker compose config`: passed and resolved Postgres `15432:5432`, Redis `16379:6379`, and default mappings for the other services.
- `docker compose build`: passed.
- `docker compose up -d`: passed with no Compose YAML edits.
- `docker compose ps`: all services were up; Postgres published `15432->5432`, Redis published `16379->6379`, and cAdvisor became healthy after startup.
- API health check passed: `GET http://localhost:4000/health` returned API, PostgreSQL, and Redis status `ok`.
- PostgreSQL connectivity passed with `docker compose exec -T postgres pg_isready -U food_delivery -d food_delivery`.
- Redis connectivity passed with `docker compose exec -T redis redis-cli ping`.
- Prometheus API query for `up{job="food-delivery-api"}` returned `1`.
- Grafana health returned database `ok`.
- Loki ingestion check passed with a narrowed `{container="food-delivery-api"}` query showing current API `/health` and `/metrics` logs.
- Tempo ingestion check passed and returned traces for `service.name=food-delivery-api`.
- `source ./skills.sh; skill_verify_ports`: passed, 26 passed and 0 failed.
- `source ./skills.sh; skill_verify_workspace`: passed, 9 passed and 0 failed.
- `source ./skills.sh; skill_verify`: passed, 5 passed and 0 failed.
- `source ./skills.sh; skill_verify_observability`: first run failed while Grafana datasource health returned startup 503s; direct datasource checks then passed, and rerun passed with 7 passed and 0 failed.
- `pnpm test:cov --runInBand`: tests passed, but coverage thresholds failed with 41.09% statements, 42.81% branches, 36.68% functions, and 39.65% lines. This remains the known Phase 3 coverage gap.

Known issues:
- Coverage thresholds still fail until focused Phase 3 unit tests are added.
- The default host PostgreSQL port `localhost:5432` remains occupied on this machine. Use `.env` host-port overrides such as `POSTGRES_HOST_PORT=15432`.
- If overriding `POSTGRES_HOST_PORT` or `REDIS_HOST_PORT`, host-run API/e2e commands must mirror those localhost ports in `DATABASE_URL`, `TEST_DATABASE_URL`, or `REDIS_PORT`.
- E2E tests can still share Redis with the live stack when both are run together. Clear Redis after e2e or isolate/namespace cache keys to avoid live cache entries pointing at test database IDs.
- Alloy Docker log discovery currently sees all local Docker containers and hard-codes the project label during relabeling. Broad Loki queries such as `{project="food-delivery-observability",service="api"}` may include unrelated local containers; use `container="food-delivery-api"` for precise validation or scope Alloy discovery in a follow-up.
- Loki `/ready` returned 503 during this run even while log query ingestion worked. Tempo, Prometheus, Grafana health, and settled Grafana datasource checks passed.
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

If a default host port is occupied, set overrides in the ignored root `.env` instead of editing Compose YAML:

```bash
POSTGRES_HOST_PORT=15432
REDIS_HOST_PORT=16379
```

Phase 4 readiness:
`apps/web/README.md` reserves the web app location and documents that the future frontend should use Next.js. No frontend package or business functionality exists yet. The backend stack is reproducible on this machine with `.env` host-port overrides and no Compose file edits.

Next recommended task:
Close remaining Phase 3 Definition of Done gaps before Phase 4: add focused unit tests until coverage passes, scope Alloy Docker log discovery to this Compose project, isolate Redis/cache state for e2e tests, and expand Grafana dashboards plus Prometheus alerts for Phase 3 metric families.

Last updated:
2026-07-13 23:37 PHT/UTC+08

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
