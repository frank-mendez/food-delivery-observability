# AGENTS.md

## Project Summary

`food-delivery-observability` is a local Docker-based learning project for a production-like food delivery backend. The project focuses on a solid backend and observability foundation before adding advanced delivery features.

## Current Phase

Phase 1: NestJS API, PostgreSQL, Redis, Docker Compose, Prometheus, Grafana, basic metrics, seeded restaurants, and order creation.

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
- Jest and Supertest
- pnpm

## Folder Structure

```text
.
├── docker/postgres/init-test-db.sql
├── grafana/provisioning/datasources/datasource.yml
├── prisma/schema.prisma
├── prisma/seed.js
├── prisma/migrations/
├── prometheus/prometheus.yml
├── src/common/interceptors/
├── src/health/
├── src/metrics/
├── src/orders/
├── src/prisma/
├── src/redis/
├── src/restaurants/
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
```

## Coding Conventions

- Use clean, boring, production-style code.
- Prefer explicit names over clever abstractions.
- Keep Phase 1 architecture simple.
- Do not add authentication yet.
- Do not add payments yet.
- Do not add BullMQ yet.
- Do not add Loki or Tempo yet.
- Do not add a Next.js frontend yet.
- Keep controllers thin and put business logic in services.
- Use Prisma for database access.
- Validate request bodies with DTOs and Nest validation pipes.

## Observability Rules

- Keep `/metrics` Prometheus-compatible.
- Track HTTP request count and duration for all API routes.
- Track successful and failed order creation separately.
- Track order creation duration.
- Track health check count.
- Keep metric names stable unless a migration note is added here.
- Prefer low-cardinality labels.
- Do not add user ids, order ids, restaurant ids, or menu item ids as metric labels.

## Testing Expectations

- Configure and use Jest.
- Unit-test service-layer business logic.
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
- Grafana only provisions the Prometheus datasource in Phase 1.
- No authentication, payment, async worker, tracing, or centralized logs are included yet.

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
Phase 1 foundation is implemented and verified. The full Docker stack runs when required host ports are available. On this machine, host PostgreSQL already listens on `127.0.0.1:5432`, so Docker verification used a temporary Compose override mapping Postgres to `15432:5432` while preserving the repository's required `5432:5432` mapping.

Completed work:
- Created NestJS modules for health, restaurants, orders, metrics, Prisma, and Redis.
- Added Prisma schema, initial migration, and seed data for restaurants/menu items.
- Added Docker Compose services for API, PostgreSQL, Redis, Prometheus, and Grafana.
- Added Prometheus scrape config and Grafana datasource provisioning.
- Added service-layer unit tests and API e2e tests.
- Added `skills.sh` helper commands.
- Added `GET /` API index route for a useful browser entrypoint.
- Verified API health, restaurants, order creation, metrics, Prometheus scrape status, and Grafana datasource provisioning.

Pending work:
- None for Phase 1.

Important decisions:
- Prisma 7 uses `@prisma/adapter-pg` with the standard `@prisma/client` import.
- API startup runs `prisma migrate deploy` and `prisma db seed`.
- Metrics use the `food_delivery_` prefix and avoid high-cardinality labels.
- Order creation accepts either `menuItemIds` or `items` with quantities.
- Docker/Corepack is pinned to `pnpm@10.29.3` to match the verified local install and avoid pnpm 11 minimum-release-age policy failures.
- `*.tsbuildinfo` is ignored and removed before Docker builds so stale TypeScript incremental state cannot suppress `dist` output.

How to run the app:
```bash
docker compose up --build
```

Known issues:
- If another local PostgreSQL service owns `localhost:5432`, `docker compose up --build` cannot bind the required Postgres port. Stop the conflicting local service or use a temporary Compose override for verification only.

Next recommended task:
Start Phase 2: order status transitions, dashboards, alert rules, and structured logs.

Last updated:
2026-07-07 13:39 PST

At the end of every major task, update the Context Handoff section in `AGENTS.md` so the next agent can continue without reading the full conversation.

## Definition Of Done

- `docker compose up --build` starts all services.
- `GET http://localhost:4000/health` works.
- `GET http://localhost:4000/restaurants` returns seeded restaurants and menu items.
- `POST http://localhost:4000/orders` creates a pending order.
- `GET http://localhost:4000/metrics` exposes Prometheus metrics.
- Prometheus can scrape the API.
- Grafana starts with Prometheus configured as a datasource.
- README explains setup and endpoints.
- `AGENTS.md` includes token-saving rules and context handoff protocol.
- `skills.sh` is executable and documents reusable helper commands.
- Unit tests, coverage, e2e tests, lint, and build pass.
