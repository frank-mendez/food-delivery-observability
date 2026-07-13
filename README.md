# Food Delivery Observability

Production-style local food delivery backend for learning NestJS, PostgreSQL, Redis, Docker Compose, Prometheus, Grafana, Grafana Alloy, Loki, Tempo, OpenTelemetry, BullMQ, and Prisma.

The repository is now a lightweight pnpm monorepo. The existing NestJS API lives in `apps/api`, observability and database infrastructure config lives in `infrastructure`, and `apps/web` is reserved for the future Phase 4 Next.js frontend. No frontend has been scaffolded yet.

## Architecture

```text
curl / clients
    |
    v
apps/api NestJS API :4000
    |-----------------> PostgreSQL :5432
    |-----------------> Redis :6379 cache + BullMQ
    |
    | /metrics
    v
Prometheus :9090 <---------------- cAdvisor :8081
    |
    v
Grafana :3000

API JSON stdout logs
    |
    v
Docker logs -> Alloy :12345 -> Loki :3100 -> Grafana

API OpenTelemetry traces
    |
    v
Alloy OTLP :4317/:4318 -> Tempo :3200 -> Grafana
```

## Repository Layout

```text
apps/api/                 NestJS API, Prisma schema, migrations, tests, Dockerfile
apps/web/                 Phase 4 frontend placeholder only
infrastructure/alloy/     Alloy log and trace pipeline config
infrastructure/grafana/   Provisioned datasources and dashboards
infrastructure/loki/      Loki local config
infrastructure/postgres/  PostgreSQL init SQL
infrastructure/prometheus Prometheus scrape config and alert rules
infrastructure/tempo/     Tempo local config
postman/                  Local API collection and environment
```

`packages/contracts` is intentionally not created yet. Shared contracts should be added later only when there are stable framework-neutral request/response types or schemas worth sharing between `apps/api` and `apps/web`.

## Requirements

- Node.js LTS
- pnpm `10.29.3` through Corepack
- Docker and Docker Compose

## Install

```bash
pnpm install
pnpm prisma:generate
```

The root package is an orchestrator. API runtime and development dependencies are owned by `apps/api/package.json`.

## API Development

```bash
pnpm dev:api
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:cov
```

Equivalent package-local commands also work from `apps/api`:

```bash
cd apps/api
pnpm dev
pnpm build
pnpm test
```

## Docker

```bash
docker compose up --build
docker compose down
docker compose logs -f api
```

Root script aliases:

```bash
pnpm docker:build
pnpm docker:up
pnpm docker:down
pnpm docker:logs
```

The API image is built from the monorepo root with `apps/api/Dockerfile` so Docker can access `pnpm-lock.yaml`, `pnpm-workspace.yaml`, the root package, and `apps/api/package.json`.

The API container runs Prisma migrations and seed data on startup.

## Prisma

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:migrate:deploy
pnpm prisma:seed
```

Prisma files live in `apps/api/prisma`. API-local Prisma commands also work from `apps/api`.

## Environment

- Root `.env.example` documents the complete local Docker stack.
- `apps/api/.env.example` documents API-only local development.
- E2E tests use `TEST_DATABASE_URL` when provided, otherwise they default to `localhost:5432/food_delivery_test`.

Do not commit real `.env` files.

## Ports

| Service | URL |
| --- | --- |
| API | http://localhost:4000 |
| Grafana | http://localhost:3000 |
| Prometheus | http://localhost:9090 |
| Loki | http://localhost:3100 |
| Tempo | http://localhost:3200 |
| Alloy UI | http://localhost:12345 |
| cAdvisor | http://localhost:8081 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

Grafana login: `admin` / `admin`.

Seeded API users all use password `Password123!`:

| Role | Email |
| --- | --- |
| Administrator | `admin@example.com` |
| Customer | `customer@example.com` |
| Restaurant Owner | `owner@example.com` |
| Rider | `rider@example.com` |

## API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | API index with endpoint and observability links |
| POST | `/auth/register` | Register a customer |
| POST | `/auth/register/restaurant-owner` | Register a restaurant owner |
| POST | `/auth/login` | Login and receive access and refresh tokens |
| POST | `/auth/refresh` | Rotate a refresh token |
| POST | `/auth/logout` | Revoke a refresh token |
| GET/PATCH | `/customers/me` | Customer profile |
| GET | `/health` | API, PostgreSQL, and Redis status |
| GET | `/restaurants` | Cached restaurant list with available menu items |
| GET | `/restaurants/:restaurantId/menu` | Cached menu |
| POST/PATCH | `/restaurants` | Restaurant owner/admin management |
| POST/PATCH/DELETE | `/restaurants/:restaurantId/menu-items` | Menu item management |
| PATCH | `/restaurants/:restaurantId/orders/:orderId/accept` | Accept paid order |
| PATCH | `/restaurants/:restaurantId/orders/:orderId/reject` | Reject paid order |
| PATCH | `/restaurants/:restaurantId/orders/:orderId/preparing` | Mark accepted order preparing |
| PATCH | `/restaurants/:restaurantId/orders/:orderId/ready` | Mark order ready and enqueue delivery assignment |
| POST | `/orders` | Customer creates an order and enqueues payment |
| GET | `/orders` | Customer order history |
| PATCH | `/orders/:orderId/cancel` | Cancel a pending/payment-pending order |
| GET/POST | `/payments/:orderId` | Inspect or retry simulated payments |
| POST | `/riders/register` | Register a rider |
| PATCH | `/riders/me/availability` | Rider availability |
| POST | `/riders/assignments` | Simulate delivery assignment |
| PATCH | `/riders/deliveries/:deliveryId/accept` | Rider accepts delivery |
| PATCH | `/riders/deliveries/:deliveryId/pick-up` | Rider picks up order |
| PATCH | `/riders/deliveries/:deliveryId/out-for-delivery` | Rider leaves for delivery |
| PATCH | `/riders/deliveries/:deliveryId/deliver` | Rider completes delivery |
| GET | `/notifications` | Current user's notification history |
| GET | `/metrics` | Prometheus metrics |

## Observability

Prometheus scrapes API metrics from `api:4000/metrics`, cAdvisor container metrics from `cadvisor:8080`, and Prometheus self metrics.

Key application metric families include:

- `food_delivery_http_requests_total`
- `food_delivery_http_request_duration_seconds`
- `food_delivery_http_active_requests`
- `food_delivery_database_query_duration_seconds`
- `food_delivery_redis_operation_duration_seconds`
- `food_delivery_auth_attempts_total`
- `food_delivery_order_status_transitions_total`
- `food_delivery_payment_attempts_total`
- `food_delivery_queue_depth`
- `food_delivery_notification_events_total`
- `food_delivery_cache_events_total`
- `food_delivery_rider_delivery_events_total`
- `food_delivery_domain_events_total`

Grafana provisions Prometheus, Loki, and Tempo datasources plus API, Orders, Infrastructure, Logs, and Tracing dashboards from `infrastructure/grafana`.

Prometheus loads alert rules from `infrastructure/prometheus/alert-rules.yml`.

Useful checks:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/metrics
open http://localhost:9090/targets
```

## Helper Commands

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

The script can also be executed directly:

```bash
./skills.sh skill_info
```

## Testing

```bash
pnpm test
pnpm test:cov
pnpm test:e2e
```

E2E tests require PostgreSQL and Redis:

```bash
docker compose up -d postgres redis
pnpm test:e2e
```

If another local PostgreSQL service owns `localhost:5432`, use a temporary Compose override or stop the conflicting service before running default e2e commands.

## Postman

Import `postman/food-delivery-observability.postman_collection.json` and `postman/food-delivery-observability.postman_environment.json` into Postman.

Run the seeded login requests first, then `GET /restaurants` so the collection captures access tokens, `restaurantId`, and `menuItemId` variables.

## Troubleshooting

- `docker compose up --build` cannot bind `5432`: stop the local PostgreSQL service already using `localhost:5432`.
- API Docker build cannot find workspace files: confirm the Compose API build context is the repo root and the Dockerfile path is `apps/api/Dockerfile`.
- Grafana has no dashboards: check `docker compose logs grafana` and verify `infrastructure/grafana/provisioning` is mounted.
- Loki has no API logs: hit `http://localhost:4000/health`, then check `docker compose logs alloy` and `./skills.sh skill_loki`.
- Tempo has no traces: hit `http://localhost:4000/health`, wait a few seconds, then run `./skills.sh skill_trace`.
- Prometheus target is down: check `http://localhost:9090/targets` and `docker compose logs api prometheus`.
- Redis or database alerts are firing after startup: call `http://localhost:4000/health` to refresh dependency gauges, then inspect service logs.
