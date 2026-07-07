# Food Delivery Observability

Production-style food delivery backend foundation for learning NestJS, PostgreSQL, Redis, Docker Compose, Prometheus, and Grafana.

Phase 1 builds a small API with health checks, seeded restaurants, order creation, and Prometheus metrics.

## Architecture

```text
curl / clients
    |
    v
NestJS API :4000
    |-----------------> PostgreSQL :5432
    |-----------------> Redis :6379
    |
    v
/metrics
    ^
    |
Prometheus :9090 ----> Grafana :3000
```

## Local Setup

```bash
pnpm install
pnpm prisma generate
docker compose up --build
```

The API container runs migrations and seeds restaurants on startup.

If `localhost:5432` is already used by another local PostgreSQL service, stop that service before running the default Compose stack. The repository intentionally maps PostgreSQL to `5432` for Phase 1.

Useful URLs:

- API: http://localhost:4000
- Health: http://localhost:4000/health
- Metrics: http://localhost:4000/metrics
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000
- Grafana login: `admin` / `admin`

## Docker Commands

```bash
docker compose up --build
docker compose up --build -d
docker compose logs -f api
docker compose down
docker compose down -v
```

## API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | API index with available endpoint paths |
| GET | `/health` | API, PostgreSQL, and Redis status |
| GET | `/restaurants` | Seeded restaurants with menu items |
| POST | `/orders` | Create an order with menu item ids |
| GET | `/metrics` | Prometheus metrics |

## Curl Examples

API index:

```bash
curl http://localhost:4000/
```

Health:

```bash
curl http://localhost:4000/health
```

Restaurants:

```bash
curl http://localhost:4000/restaurants
```

Create an order:

```bash
curl -X POST http://localhost:4000/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "restaurantId": "replace-with-restaurant-id",
    "menuItemIds": [
      "replace-with-menu-item-id",
      "replace-with-another-menu-item-id"
    ]
  }'
```

Create an order with quantities:

```bash
curl -X POST http://localhost:4000/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "restaurantId": "replace-with-restaurant-id",
    "items": [
      { "menuItemId": "replace-with-menu-item-id", "quantity": 2 }
    ]
  }'
```

Metrics:

```bash
curl http://localhost:4000/metrics
```

## Metrics

Application metrics:

- `food_delivery_http_requests_total`
- `food_delivery_http_request_duration_seconds`
- `food_delivery_orders_created_total`
- `food_delivery_order_creation_duration_seconds`
- `food_delivery_failed_order_creation_total`
- `food_delivery_health_check_total`

Default Node.js process metrics are also exported with the `food_delivery_` prefix.

Prometheus scrapes the API at `api:4000/metrics` from inside Docker. Check targets at:

```text
http://localhost:9090/targets
```

Grafana is provisioned with Prometheus as the default datasource. Check datasources at:

```text
http://localhost:3000/connections/datasources
```

## Testing

Unit tests:

```bash
pnpm test
```

Coverage:

```bash
pnpm test:cov
```

E2E tests use the separate `food_delivery_test` PostgreSQL database. Start PostgreSQL and Redis first:

```bash
docker compose up -d postgres redis
pnpm test:e2e
```

Lint and format:

```bash
pnpm lint
pnpm format
```

## Agent Skills

`skills.sh` provides reusable helper commands for future agents and developers.

Run a helper directly:

```bash
./skills.sh skill_info
./skills.sh skill_verify
```

Available helpers:

| Command | Purpose |
| --- | --- |
| `skill_help` | List all helper commands |
| `skill_info` | Print project phase, stack, and URLs |
| `skill_tree` | Display project structure |
| `skill_up` | Start all services |
| `skill_down` | Stop services |
| `skill_restart` | Restart services |
| `skill_logs` | Tail all logs |
| `skill_logs_api` | Tail API logs |
| `skill_logs_db` | Tail PostgreSQL logs |
| `skill_logs_grafana` | Tail Grafana logs |
| `skill_logs_prometheus` | Tail Prometheus logs |
| `skill_db_shell` | Open PostgreSQL shell |
| `skill_prisma_generate` | Generate Prisma Client |
| `skill_prisma_migrate` | Create/apply a migration |
| `skill_prisma_seed` | Seed restaurants and menu items |
| `skill_prisma_reset` | Reset database |
| `skill_test` | Run unit tests |
| `skill_test_watch` | Run unit tests in watch mode |
| `skill_lint` | Run ESLint |
| `skill_format` | Run Prettier |
| `skill_metrics` | Fetch `/metrics` |
| `skill_health` | Fetch `/health` |
| `skill_prometheus` | Check Prometheus readiness |
| `skill_grafana` | Check Grafana health |
| `skill_api` | Run API locally in watch mode |
| `skill_shell` | Shell into API container |
| `skill_clean` | Remove containers, volumes, dist, and coverage |
| `skill_rebuild` | Rebuild API image and restart |
| `skill_verify` | Verify PostgreSQL, Redis, API, Prometheus, and Grafana |

## Phase 2 TODOs

- Add order status transitions.
- Add richer service dashboards in Grafana.
- Add API latency and order SLO panels.
- Add Redis-backed caching for restaurants.
- Add request correlation ids and structured JSON logs.
- Add load-generation scripts for observability practice.
- Add alerting rules in Prometheus.
- Add more failure scenarios for learning incident diagnosis.
