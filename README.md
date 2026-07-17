# Food Delivery Observability

Production-style local food delivery platform for learning Next.js, NestJS, PostgreSQL, Redis, Docker Compose, Prometheus, Grafana, Grafana Alloy, Loki, Tempo, OpenTelemetry, BullMQ, and Prisma.

The repository is a lightweight pnpm monorepo. The NestJS API lives in `apps/api`, the Phase 4 Next.js frontend lives in `apps/web`, and observability plus database infrastructure config lives in `infrastructure`.

## Architecture

```text
browser / clients
    |
    v
apps/web Next.js App Router :3001
    |
    | /api/backend proxy
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
apps/web/                 Next.js App Router frontend, Storybook, Vitest, Playwright, Dockerfile
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

The root package is an orchestrator. API runtime and development dependencies are owned by `apps/api/package.json`; frontend dependencies are owned by `apps/web/package.json`.

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

## Frontend

Phase 4 is implemented in `apps/web` as a production-style Next.js App Router application. It uses TypeScript, Tailwind CSS, shadcn-style primitives, TanStack Query, Zustand, React Hook Form, Zod, Storybook, Vitest, React Testing Library, Playwright, Lucide icons, and Framer Motion.

The app includes customer ordering flows, restaurant operator views, rider delivery views, a development role switcher, dark mode, loading/error/empty states, and reusable UI components for cards, metrics, status badges, timelines, buttons, and feedback states.

### Running Web

```bash
pnpm dev
pnpm dev:web
pnpm build:web
pnpm lint:web
pnpm typecheck:web
pnpm test:web
pnpm playwright
pnpm storybook
```

`pnpm dev` is an alias for `pnpm dev:web`. The local web app runs on `http://localhost:3001` and proxies backend calls through `/api/backend`. In Docker, the web service uses `API_BASE_URL=http://api:4000` by default.

### Frontend Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing and stack health overview |
| `/restaurants` | Restaurant listing, search, and filters |
| `/restaurants/:restaurantId` | Restaurant details and menu browsing |
| `/cart` | Shopping cart |
| `/checkout` | Customer checkout and order creation |
| `/orders` | Customer order history |
| `/orders/:orderId` | Order tracking |
| `/profile` | Customer profile |
| `/restaurant` | Restaurant portal dashboard |
| `/restaurant/orders` | Incoming and active restaurant orders |
| `/restaurant/menu` | Menu listing and edit form |
| `/restaurant/analytics` | Restaurant analytics cards |
| `/rider` | Rider portal and available deliveries |
| `/rider/current` | Current delivery |
| `/rider/history` | Delivery history |

## Docker

```bash
docker compose up --build
docker compose down
docker compose logs -f api
docker compose logs -f web
```

Root script aliases:

```bash
pnpm docker:build
pnpm docker:app
pnpm docker:up
pnpm docker:down
pnpm docker:logs
```

Use `pnpm docker:app` to start the backend and web services with their required Compose dependencies. Use `pnpm docker:up` for the full stack.

The API and web images are built from the monorepo root with `apps/api/Dockerfile` and `apps/web/Dockerfile` so Docker can access `pnpm-lock.yaml`, `pnpm-workspace.yaml`, the root package, and each workspace package manifest.

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

| Service | Default host URL |
| --- | --- |
| Web | http://localhost:3001 |
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

## Host Port Configuration

Docker host ports are configurable through the root `.env` file. The defaults work on a clean machine, and you can override only the host side when a local service or another container already owns a common port.

Container-to-container networking does not use these host ports. The API and observability services still connect internally with stable Docker service names and container ports such as `postgres:5432`, `redis:6379`, `api:4000`, `loki:3100`, `tempo:3200`, and `alloy:4318`.

| Service | Variable | Default host port | Container port |
| --- | --- | ---: | ---: |
| API | `API_HOST_PORT` | 4000 | 4000 |
| Web | `WEB_HOST_PORT` | 3001 | 3001 |
| PostgreSQL | `POSTGRES_HOST_PORT` | 5432 | 5432 |
| Redis | `REDIS_HOST_PORT` | 6379 | 6379 |
| Prometheus | `PROMETHEUS_HOST_PORT` | 9090 | 9090 |
| Grafana | `GRAFANA_HOST_PORT` | 3000 | 3000 |
| Loki | `LOKI_HOST_PORT` | 3100 | 3100 |
| Tempo | `TEMPO_HOST_PORT` | 3200 | 3200 |
| Alloy UI | `ALLOY_HOST_PORT` | 12345 | 12345 |
| Alloy OTLP gRPC | `ALLOY_OTLP_GRPC_HOST_PORT` | 4317 | 4317 |
| Alloy OTLP HTTP | `ALLOY_OTLP_HTTP_HOST_PORT` | 4318 | 4318 |
| cAdvisor | `CADVISOR_HOST_PORT` | 8081 | 8080 |

Example conflict resolution in `.env`:

```bash
POSTGRES_HOST_PORT=15432
REDIS_HOST_PORT=16379
```

Then start the stack normally:

```bash
pnpm docker:app
```

Host-run API or e2e commands use localhost ports, so mirror overrides there when needed:

```bash
DATABASE_URL="postgresql://food_delivery:food_delivery@localhost:15432/food_delivery?schema=public"
TEST_DATABASE_URL="postgresql://food_delivery:food_delivery@localhost:15432/food_delivery_test?schema=public"
REDIS_PORT=16379
```

Useful port checks:

```bash
source ./skills.sh
skill_ports
skill_check_ports
docker ps
ss -lptn
lsof -i
```

Seeded API users all use password `Password123!`:

| Role | Email |
| --- | --- |
| Administrator | `admin@example.com` |
| Customer | `customer@example.com` |
| Restaurant Owner | `owner@example.com` |
| Rider | `rider@example.com` |

The web app uses these seeded accounts through a development-only role switcher. It stores the selected role locally and logs in against the real backend, so browse, checkout, restaurant order, and rider delivery actions generate normal API metrics, logs, and traces.

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
skill_ports
skill_check_ports
skill_verify_ports
skill_verify_workspace
skill_verify
skill_verify_observability
skill_web
skill_storybook
skill_test_web
skill_playwright
skill_verify_web
skill_metrics
skill_trace
skill_dashboards
```

The script can also be executed directly:

```bash
./skills.sh skill_info
```

## Storybook

Reusable frontend components have Storybook coverage for button variants, restaurant cards, menu cards, metric cards, status badges, timelines, empty states, and error states.

```bash
pnpm storybook
pnpm build-storybook
```

## Testing

```bash
pnpm test
pnpm test:web
pnpm playwright
pnpm test:cov
pnpm test:e2e
```

`pnpm test:web` runs Vitest and React Testing Library with coverage thresholds above 80%. `pnpm playwright` runs the Phase 4 customer flow and role-switcher browser tests across desktop and mobile projects.

E2E tests require PostgreSQL and Redis:

```bash
docker compose up -d postgres redis
pnpm test:e2e
```

If another local PostgreSQL or Redis service owns the default host ports, set `POSTGRES_HOST_PORT` or `REDIS_HOST_PORT` in `.env` and mirror those localhost ports in `TEST_DATABASE_URL` or `REDIS_PORT` for host-run e2e commands.

## Postman

Import `postman/food-delivery-observability.postman_collection.json` and `postman/food-delivery-observability.postman_environment.json` into Postman.

Run the seeded login requests first, then `GET /restaurants` so the collection captures access tokens, `restaurantId`, and `menuItemId` variables.

## Troubleshooting

- `docker compose up --build` cannot bind a port: run `source ./skills.sh; skill_check_ports`, then set the suggested `*_HOST_PORT` override in `.env`.
- Local PostgreSQL uses `5432`: set `POSTGRES_HOST_PORT=15432` in `.env`; containers still use `postgres:5432` internally.
- Local Redis uses `6379`: set `REDIS_HOST_PORT=16379` in `.env`; containers still use `redis:6379` internally.
- Another Docker container publishes the same port: inspect it with `docker ps` and choose a different `*_HOST_PORT` value.
- API Docker build cannot find workspace files: confirm the Compose API build context is the repo root and the Dockerfile path is `apps/api/Dockerfile`.
- Web Docker build cannot find workspace files: confirm the Compose web build context is the repo root and the Dockerfile path is `apps/web/Dockerfile`.
- Web frontend cannot reach the API in Docker: check the web service `API_BASE_URL` value; the default should be `http://api:4000`.
- Web frontend cannot reach a host-run API: set `NEXT_PUBLIC_API_BASE_URL` only when intentionally bypassing the built-in `/api/backend` proxy.
- Grafana has no dashboards: check `docker compose logs grafana` and verify `infrastructure/grafana/provisioning` is mounted.
- Loki has no API logs: hit `http://localhost:4000/health`, then check `docker compose logs alloy` and `./skills.sh skill_loki`.
- Tempo has no traces: hit `http://localhost:4000/health`, wait a few seconds, then run `./skills.sh skill_trace`.
- Prometheus target is down: check `http://localhost:9090/targets` and `docker compose logs api prometheus`.
- Redis or database alerts are firing after startup: call `http://localhost:4000/health` to refresh dependency gauges, then inspect service logs.
