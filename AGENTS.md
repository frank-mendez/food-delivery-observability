# AGENTS.md

## Project Summary

`food-delivery-observability` is a local Docker-based learning project for a production-like food delivery backend. The project now focuses on complete local observability for a small NestJS food delivery API.

## Current Phase

Phase 2: production-like observability with NestJS API, PostgreSQL, Redis, Docker Compose, Prometheus, Grafana, Grafana Alloy, Loki, Tempo, cAdvisor, OpenTelemetry traces, structured JSON logs, dashboards, and alert rules.

## Tech Stack

- Node.js LTS
- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- Redis
- Docker Compose
- Prometheus
- Grafana
- Grafana Alloy
- Loki
- Tempo
- OpenTelemetry
- cAdvisor
- Jest and Supertest
- pnpm

## Folder Structure

```text
.
├── alloy/config.alloy
├── docker/postgres/init-test-db.sql
├── grafana/dashboards/
├── grafana/provisioning/dashboards/dashboards.yml
├── grafana/provisioning/datasources/datasource.yml
├── loki/loki-config.yml
├── prisma/schema.prisma
├── prisma/seed.js
├── prisma/migrations/
├── prometheus/prometheus.yml
├── prometheus/alert-rules.yml
├── src/common/filters/
├── src/common/interceptors/
├── src/common/logging/
├── src/common/middleware/
├── src/common/request-context/
├── src/common/tracing/
├── src/health/
├── src/metrics/
├── src/orders/
├── src/prisma/
├── src/redis/
├── src/restaurants/
├── tempo/tempo.yml
├── test/
├── docker-compose.yml
├── Dockerfile
├── README.md
├── AGENTS.md
└── skills.sh
```

## Commands

```bash
pnpm install
pnpm prisma generate
pnpm test
pnpm test:cov
docker compose up --build
docker compose up -d postgres redis
pnpm test:e2e
./skills.sh skill_info
./skills.sh skill_verify
./skills.sh skill_verify_observability
./skills.sh skill_metrics
./skills.sh skill_trace
./skills.sh skill_dashboards
./skills.sh skill_prometheus
./skills.sh skill_loki
./skills.sh skill_tempo
./skills.sh skill_alloy
```

## Coding Conventions

- Use clean, boring, production-style code.
- Prefer explicit names over clever abstractions.
- Keep Phase 2 business logic small.
- Do not add authentication yet.
- Do not add payments yet.
- Do not add BullMQ yet.
- Do not add a rider module yet.
- Do not add notifications yet.
- Do not add a Next.js frontend yet.
- Keep controllers thin and put business logic in services.
- Use Prisma for database access.
- Validate request bodies with DTOs and Nest validation pipes.

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
- Track Redis status and operation latency.
- Use structured JSON logs through the shared logger, not `console.*`.
- Include requestId, correlationId, traceId, and spanId in request logs.
- Export traces to Tempo through Alloy using OTLP.

## Testing Expectations

- Configure and use Jest.
- Unit-test service-layer business logic.
- Unit-test logging, metrics, and tracing helpers.
- Use Supertest for endpoint integration tests.
- Use the separate `food_delivery_test` PostgreSQL database for e2e tests.
- Mock external dependencies in unit tests.
- Generate coverage with `pnpm test:cov`.
- Keep service-layer coverage above the configured thresholds.
- Run lint/tests after meaningful code changes.

## Known Constraints

- This is a local learning stack, not a deployment-ready production system.
- The API container runs migrations and seed data on startup for one-command local setup.
- Redis is currently used for connectivity and health checks only.
- Grafana provisions local datasources and dashboards, but screenshots are placeholders in README.
- No authentication, payment, async worker, rider, notification, or frontend features are included yet.

## Token-Saving Rules

- Before editing, inspect only the files needed for the task.
- Prefer targeted file reads instead of scanning the whole repo.
- Do not rewrite large files unless necessary.
- Summarize findings before making broad changes.
- Avoid repeating full file contents in responses.
- Use concise commit-style summaries after changes.
- Keep explanations focused on what changed, why, and how to verify.
- When context gets long, create or update a handoff section in this file.

## Agent Workflow

1. Read `AGENTS.md`.
2. Run `./skills.sh skill_info`.
3. Run `./skills.sh skill_verify`.
4. Read only the files relevant to the task.
5. Make focused changes.
6. Run lint/tests.
7. Update the Context Handoff section.
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
Phase 3 backend expansion is mostly implemented and live-functional, but not fully complete by the repository Definition of Done. On 2026-07-13, Prisma generation, Prisma validation, no-fix ESLint, Nest build, unit tests, e2e tests, `skill_verify`, `skill_verify_observability`, and a manual live Phase 3 lifecycle smoke test passed. The live stack needed a temporary Compose stdin override mapping Postgres to `15432:5432` because the default `localhost:5432` binding is still occupied on this machine; `docker compose down` was run afterward. Remaining blockers are coverage thresholds, Phase 3 dashboard/alert expansion, and Redis cache/test isolation.

Completed work:
- Added Phase 3 Prisma schema and migration for users, roles, refresh tokens, customer profiles, rider profiles, expanded order statuses, payments, deliveries, notifications, and domain events.
- Added JWT authentication with bcrypt password hashing, refresh token rotation/revocation, customer registration, restaurant-owner registration, rider registration, admin user creation, and role guards.
- Added customer profile and order-history endpoints.
- Expanded restaurant endpoints for owner/admin restaurant management, open/close status, menu item create/update/disable, and owner order actions: accept, reject, preparing, ready.
- Expanded order flow so authenticated customers place orders, create payment records, transition to `PAYMENT_PENDING`, enqueue payment jobs, view history, and cancel pending/payment-pending orders.
- Added payment simulator workers for success, failure, timeout, and retry through BullMQ payment/retry queues.
- Added BullMQ queue service for payment, notification, delivery, retry, and dead-letter queues with queue depth, duration, retry, and failure metrics.
- Added notification workers simulating email, SMS, and push notification jobs with durable notification records.
- Added rider module for availability, simulated delivery assignment, accepting deliveries, pickup, out-for-delivery, delivered, and delivery history.
- Added Redis cache wrapper and cached restaurant list, detail, menu, and popular item reads with hit/miss/latency/invalidation metrics.
- Added domain-event persistence and metrics for lifecycle/business events.
- Expanded metrics for auth attempts, order transitions, payment attempts/duration, queue depth/duration/failures/retries, notifications, cache behavior, rider delivery events, and domain events.
- Updated Docker Compose with JWT and payment simulator environment variables.
- Updated seed data with demo admin/customer/restaurant owner/rider users. All seeded users use password `Password123!`.
- Updated README, `skills.sh`, unit tests, and e2e test expectations for Phase 3.
- Added OpenTelemetry SDK initialization in `src/tracing.ts` with OTLP trace export to Alloy.
- Added request context middleware for request IDs, correlation IDs, trace IDs, and span IDs.
- Added structured JSON logger and global exception filter for validation failures, database errors, Redis failures, and unexpected exceptions.
- Added global tracing interceptor plus explicit service/Prisma/Redis spans.
- Expanded metrics for active HTTP requests, status codes, order value, DB query duration, DB pool usage, DB status, Redis status, and Redis latency.
- Updated Prisma to use an explicit `pg.Pool` through `@prisma/adapter-pg` for pool metrics.
- Added Loki, Tempo, Alloy, and cAdvisor services to Docker Compose.
- Added Alloy Docker log collection and OTLP trace forwarding.
- Added Loki and Tempo local configs.
- Added Prometheus cAdvisor scrape config and alert rules.
- Provisioned Grafana Prometheus, Loki, and Tempo datasources.
- Added five Grafana dashboards: API, Orders, Infrastructure, Logs, and Tracing.
- Improved order DTO validation to require exactly one of `items` or `menuItemIds`.
- Updated unit and e2e tests for observability and Phase 3 contracts.
- Updated README and `skills.sh` for Phase 3.
- Added a Postman collection at `postman/food-delivery-observability.postman_collection.json` covering all API endpoints with seeded login requests and collection variables for tokens, restaurant/menu IDs, order IDs, and delivery IDs.
- Added a Postman local environment at `postman/food-delivery-observability.postman_environment.json` with Grafana `admin` / `admin` credentials and seeded API user credential variables.

Pending work:
- Add focused unit coverage for Phase 3 services so `pnpm test:cov --runInBand` passes the configured global thresholds.
- Expand Grafana dashboards and Prometheus alerts for Phase 3 auth, payment, queue, cache, rider, notification, and domain-event metrics.
- Isolate e2e Redis/cache state from the live stack, or namespace cache keys by environment/database. Running e2e against the same Redis while the live stack is up populated restaurant cache entries with test-database IDs and caused live `POST /orders` to return `Restaurant not found` until Redis was cleared.
- Capture real Grafana screenshots later if desired; README currently lists placeholders only.

Important decisions:
- Metrics keep the `food_delivery_` prefix and avoid high-cardinality labels.
- Logs may include operational fields, but metric labels must not include user/order/restaurant/menu item IDs.
- JWT access tokens default to 15 minutes and refresh tokens default to 7 days; local fallback secrets exist for development, while Compose provides explicit local secrets.
- Refresh tokens are stored only as bcrypt hashes and rotated on refresh.
- Restaurant/menu/order management is role-protected. Seeded restaurants are owned by `owner@example.com`.
- `DELETE /restaurants/:restaurantId/menu-items/:menuItemId` disables the item instead of physically deleting it, preserving order history and FK safety.
- Order transitions are enforced by `src/orders/order-status-transitions.ts`.
- Payment timeout jobs mark the payment `RETRYING` and enqueue a retry that currently resolves as success.
- Delivery assignment is simulated by selecting the oldest available rider profile and setting that rider `BUSY` until delivery is completed.
- Redis cache failures are logged as warnings and treated as cache misses so the API can continue using PostgreSQL.
- API logs are written directly to stdout as JSON with `process.stdout.write`, then collected by Alloy from Docker logs and sent to Loki.
- Traces are exported from the API to Alloy at `http://alloy:4318` and forwarded to Tempo.
- Prometheus remains pull-based for API and cAdvisor metrics.
- Prisma query metrics use event durations and SQL operation labels only; SQL text and params are not logged.
- Redis instrumentation is limited to connection state and `PING` latency until Redis becomes a real data path.

How to run the app:
```bash
docker compose up --build
```

Known issues:
- If another local PostgreSQL service owns `localhost:5432`, `docker compose up --build` cannot bind the required Postgres port. Stop the conflicting local service or use a temporary Compose override for verification only.
- `skill_verify` and `skill_verify_observability` require the Docker stack to be running.
- Tempo search may need a few seconds after a request before traces are queryable.
- Grafana datasource health for Tempo is not implemented in Grafana 11.3.1, so `skill_verify_observability` verifies the Tempo datasource by UID and checks Tempo readiness directly.
- `pnpm test:e2e` passed on 2026-07-13 using `TEST_DATABASE_URL=postgresql://food_delivery:food_delivery@localhost:15432/food_delivery_test?schema=public` and a temporary Compose override for Postgres. The default `localhost:5432` test URL still targets the conflicting local PostgreSQL service on this machine.
- `pnpm test:cov --runInBand` failed on 2026-07-13: 10 suites and 22 tests passed, but global coverage was 41.09% statements, 42.81% branches, 36.68% functions, and 39.65% lines, below the configured thresholds.

Next recommended task:
Close the remaining Phase 3 Definition of Done gaps: add unit tests for auth/cache/customers/domain-events/notifications/payments/queues/order lifecycle/riders until coverage passes, expand Grafana dashboards and Prometheus alerts for the new Phase 3 metric families, and isolate Redis cache state for e2e tests. Do not build a frontend unless scope changes.

Last updated:
2026-07-13 21:55 PHT/UTC+08

At the end of every major task, update the Context Handoff section in `AGENTS.md` so the next agent can continue without reading the full conversation.

## Definition Of Done

- `docker compose up --build` starts all services.
- `GET http://localhost:4000/health` works.
- `GET http://localhost:4000/restaurants` returns seeded restaurants and menu items.
- `POST http://localhost:4000/orders` creates a pending order.
- `GET http://localhost:4000/metrics` exposes Prometheus metrics.
- Prometheus scrapes API and cAdvisor targets successfully.
- Loki receives structured API logs through Alloy.
- Tempo receives request traces through Alloy.
- Grafana starts with Prometheus, Loki, and Tempo datasources.
- Grafana dashboards are automatically provisioned.
- Prometheus alert rules load successfully.
- README explains setup, endpoints, observability architecture, ports, metrics, logs, traces, dashboards, alerts, and troubleshooting.
- `AGENTS.md` includes token-saving rules and current context handoff.
- `skills.sh` is executable and documents reusable helper commands.
- Unit tests, coverage, e2e tests, lint, and build pass.
