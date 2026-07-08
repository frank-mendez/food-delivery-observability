# Food Delivery Observability

Production-style food delivery backend for learning NestJS, PostgreSQL, Redis, Docker Compose, Prometheus, Grafana, Grafana Alloy, Loki, Tempo, and OpenTelemetry.

Phase 2 keeps the business domain intentionally small while making the service observable through metrics, structured logs, and distributed traces.

## Architecture

```text
curl / clients
    |
    v
NestJS API :4000
    |-----------------> PostgreSQL :5432
    |-----------------> Redis :6379
    |
    | /metrics
    v
Prometheus :9090 <---------------- cAdvisor :8080
    |
    v
Grafana :3000

NestJS JSON stdout logs
    |
    v
Docker logs -> Grafana Alloy :12345 -> Loki :3100 -> Grafana

NestJS OpenTelemetry traces
    |
    v
Grafana Alloy OTLP :4317/:4318 -> Tempo :3200 -> Grafana
```

## Local Setup

```bash
pnpm install
pnpm prisma generate
docker compose up --build
```

The API container runs Prisma migrations and seed data on startup.

If `localhost:5432` is already used by another local PostgreSQL service, stop that service before running the default Compose stack. The repository intentionally maps PostgreSQL to `5432`.

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

## API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | API index with endpoint and observability links |
| GET | `/health` | API, PostgreSQL, and Redis status |
| GET | `/restaurants` | Seeded restaurants with menu items |
| POST | `/orders` | Create an order with menu item ids or item quantities |
| GET | `/metrics` | Prometheus metrics |

Create an order:

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

## Metrics

Prometheus scrapes:

- API metrics from `api:4000/metrics`
- cAdvisor container metrics from `cadvisor:8080`
- Prometheus self metrics

Important application metrics:

- `food_delivery_http_requests_total`
- `food_delivery_http_request_duration_seconds`
- `food_delivery_http_active_requests`
- `food_delivery_orders_created_total`
- `food_delivery_failed_order_creation_total`
- `food_delivery_order_creation_duration_seconds`
- `food_delivery_order_value_dollars`
- `food_delivery_average_order_value_dollars`
- `food_delivery_database_query_duration_seconds`
- `food_delivery_database_connection_pool_connections`
- `food_delivery_database_connection_status`
- `food_delivery_redis_connection_status`
- `food_delivery_redis_operation_duration_seconds`

Default Node.js process metrics are also exported with the `food_delivery_` prefix, including memory, heap, CPU, and event loop lag.

Inspect metrics:

```bash
curl http://localhost:4000/metrics
open http://localhost:9090/targets
```

## Logs

The API writes structured JSON logs to stdout. Every log includes timestamp, traceId, spanId, requestId, correlationId, level, endpoint, method, status, duration, userAgent, IP, and message.

Flow:

```text
API stdout JSON -> Docker json-file logs -> Alloy docker source -> Loki -> Grafana
```

Useful Loki queries:

```logql
{project="food-delivery-observability",service="api"} |= "\"level\":\"error\""
{project="food-delivery-observability",service="api"} |= "\"level\":\"warn\""
{project="food-delivery-observability",service="api"} |= "\"method\":\"POST\"" |= "\"endpoint\":\"/orders\""
{project="food-delivery-observability",service="api"} |= "Validation failure"
```

Inspect logs:

```bash
docker compose logs -f api
./skills.sh skill_loki
```

## Traces

The API initializes OpenTelemetry before NestJS starts. HTTP, Express, PostgreSQL, and Redis instrumentation are enabled, with explicit controller/service/Prisma/Redis spans added in the app.

Flow:

```text
API OpenTelemetry SDK -> Alloy OTLP receiver -> Tempo -> Grafana
```

Generate and inspect traces:

```bash
curl http://localhost:4000/health
./skills.sh skill_trace
```

Tempo TraceQL example:

```traceql
{ resource.service.name = "food-delivery-api" }
```

## Grafana Dashboards

Grafana automatically provisions Prometheus, Loki, and Tempo datasources plus these dashboards:

- Food Delivery API
- Food Delivery Orders
- Food Delivery Infrastructure
- Food Delivery Logs
- Food Delivery Tracing

Screenshot placeholders:

- `docs/screenshots/api-dashboard.png`
- `docs/screenshots/orders-dashboard.png`
- `docs/screenshots/infrastructure-dashboard.png`
- `docs/screenshots/logs-dashboard.png`
- `docs/screenshots/tracing-dashboard.png`

## Alerts

Prometheus loads alert rules from `prometheus/alert-rules.yml`:

- API latency above 500 ms
- HTTP 500 spike
- API memory above 80%
- Redis unavailable
- Database unavailable

Check alerts at:

```text
http://localhost:9090/alerts
```

## Helper Commands

```bash
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

Lint and build:

```bash
pnpm lint
pnpm build
```

## Troubleshooting

- `docker compose up --build` cannot bind `5432`: stop the local PostgreSQL service already using `localhost:5432`.
- Grafana has no dashboards: check `docker compose logs grafana` and verify `grafana/provisioning/dashboards/dashboards.yml` is mounted.
- Loki has no API logs: hit `http://localhost:4000/health`, then check `docker compose logs alloy` and `./skills.sh skill_loki`.
- Tempo has no traces: hit `http://localhost:4000/health`, wait a few seconds, then run `./skills.sh skill_trace`.
- Prometheus target is down: check `http://localhost:9090/targets` and `docker compose logs api prometheus`.
- Redis or database alerts are firing after startup: call `http://localhost:4000/health` to refresh dependency gauges, then inspect service logs.
