#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="food-delivery-observability"
CURRENT_PHASE="Phase 2"
API_URL="${API_URL:-http://localhost:4000}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
LOKI_URL="${LOKI_URL:-http://localhost:3100}"
TEMPO_URL="${TEMPO_URL:-http://localhost:3200}"
ALLOY_URL="${ALLOY_URL:-http://localhost:12345}"
CADVISOR_URL="${CADVISOR_URL:-http://localhost:8081}"

# List all available helper commands.
skill_help() {
  compgen -A function skill_ | sort
}

# Print project identity, stack, and important local URLs.
skill_info() {
  cat <<INFO
Project: ${PROJECT_NAME}
Current phase: ${CURRENT_PHASE}
Stack: NestJS, TypeScript, Prisma, PostgreSQL, Redis, Docker Compose, Prometheus, Grafana, Alloy, Loki, Tempo, cAdvisor
API: ${API_URL}
Grafana: ${GRAFANA_URL} (admin/admin)
Prometheus: ${PROMETHEUS_URL}
Loki: ${LOKI_URL}
Tempo: ${TEMPO_URL}
Alloy: ${ALLOY_URL}
cAdvisor: ${CADVISOR_URL}
PostgreSQL: localhost:5432
Redis: localhost:6379
INFO
}

# Display the project structure without noisy generated folders.
skill_tree() {
  if command -v tree >/dev/null 2>&1; then
    tree -a -I 'node_modules|dist|coverage|.git'
  else
    find . \
      -path './node_modules' -prune -o \
      -path './dist' -prune -o \
      -path './coverage' -prune -o \
      -path './.git' -prune -o \
      -maxdepth 4 -print | sort
  fi
}

# Start all Docker Compose services.
skill_up() {
  docker compose up --build -d
}

# Stop all Docker Compose services.
skill_down() {
  docker compose down
}

# Restart all Docker Compose services.
skill_restart() {
  docker compose restart
}

# Tail logs for all services.
skill_logs() {
  docker compose logs -f
}

# Tail API logs.
skill_logs_api() {
  docker compose logs -f api
}

# Tail PostgreSQL logs.
skill_logs_db() {
  docker compose logs -f postgres
}

# Tail Grafana logs.
skill_logs_grafana() {
  docker compose logs -f grafana
}

# Tail Prometheus logs.
skill_logs_prometheus() {
  docker compose logs -f prometheus
}

# Tail Loki logs.
skill_logs_loki() {
  docker compose logs -f loki
}

# Tail Tempo logs.
skill_logs_tempo() {
  docker compose logs -f tempo
}

# Tail Alloy logs.
skill_logs_alloy() {
  docker compose logs -f alloy
}

# Open a PostgreSQL shell in the app database.
skill_db_shell() {
  docker compose exec postgres psql -U food_delivery -d food_delivery
}

# Generate Prisma Client.
skill_prisma_generate() {
  pnpm prisma generate
}

# Create and apply a Prisma migration locally.
skill_prisma_migrate() {
  pnpm prisma migrate dev
}

# Seed restaurants and menu items.
skill_prisma_seed() {
  pnpm prisma db seed
}

# Reset the development database and rerun migrations and seed data.
skill_prisma_reset() {
  pnpm prisma migrate reset --force
}

# Run unit tests.
skill_test() {
  pnpm test
}

# Run unit tests in watch mode.
skill_test_watch() {
  pnpm test:watch
}

# Run ESLint.
skill_lint() {
  pnpm lint
}

# Format TypeScript files.
skill_format() {
  pnpm format
}

# Fetch the metrics endpoint.
skill_metrics() {
  curl -fsS "${API_URL}/metrics" | head -100
}

# Query recent Tempo traces for the API service.
skill_trace() {
  curl -fsS "${API_URL}/health" >/dev/null
  sleep 2
  curl -G -fsS "${TEMPO_URL}/api/search" \
    --data-urlencode 'tags=service.name=food-delivery-api' \
    --data-urlencode 'limit=5'
}

# Fetch the health endpoint.
skill_health() {
  curl -fsS "${API_URL}/health"
}

# Check Prometheus readiness and print its URL.
skill_prometheus() {
  curl -fsS "${PROMETHEUS_URL}/-/ready"
  printf '\n%s\n' "${PROMETHEUS_URL}"
}

# Check Loki readiness and print its URL.
skill_loki() {
  curl -fsS "${LOKI_URL}/ready"
  printf '\n%s\n' "${LOKI_URL}"
}

# Check Tempo readiness and print its URL.
skill_tempo() {
  curl -fsS "${TEMPO_URL}/ready"
  printf '\n%s\n' "${TEMPO_URL}"
}

# Check Alloy readiness and print its URL.
skill_alloy() {
  curl -fsS "${ALLOY_URL}/-/ready"
  printf '\n%s\n' "${ALLOY_URL}"
}

# Check Grafana health and print its URL.
skill_grafana() {
  curl -fsS "${GRAFANA_URL}/api/health"
  printf '\n%s\n' "${GRAFANA_URL}"
}

# List provisioned Grafana dashboards.
skill_dashboards() {
  curl -fsS -u admin:admin "${GRAFANA_URL}/api/search?query=Food%20Delivery"
}

# Start the NestJS API locally in watch mode.
skill_api() {
  pnpm start:dev
}

# Open a shell inside the API container.
skill_shell() {
  docker compose exec api sh
}

# Remove containers, volumes, build output, and coverage output.
skill_clean() {
  docker compose down -v --remove-orphans
  rm -rf dist coverage
}

# Rebuild the API image from scratch and start the stack.
skill_rebuild() {
  docker compose build --no-cache api
  docker compose up -d
}

# Verify PostgreSQL, Redis, API health, Prometheus scraping, and Grafana.
skill_verify() {
  local passed=0
  local failed=0

  _skill_check() {
    local name="$1"
    shift

    if "$@" >/tmp/skill_verify.out 2>&1; then
      printf 'PASS %s\n' "${name}"
      passed=$((passed + 1))
    else
      printf 'FAIL %s\n' "${name}"
      sed 's/^/  /' /tmp/skill_verify.out
      failed=$((failed + 1))
    fi
  }

  _skill_check "PostgreSQL connectivity" docker compose exec -T postgres pg_isready -U food_delivery -d food_delivery
  _skill_check "Redis connectivity" bash -c "docker compose exec -T redis redis-cli ping | grep -q PONG"
  _skill_check "NestJS health endpoint" bash -c "curl -fsS '${API_URL}/health' | grep -q '\"status\":\"ok\"'"
  _skill_check "Prometheus scraping" bash -c "curl -fsS '${PROMETHEUS_URL}/api/v1/query?query=up%7Bjob%3D%22food-delivery-api%22%7D' | grep -q '\"status\":\"success\"'"
  _skill_check "Grafana availability" bash -c "curl -fsS '${GRAFANA_URL}/api/health' | grep -q '\"database\"'"

  printf '\nVerification summary: %d passed, %d failed\n' "${passed}" "${failed}"

  if [ "${failed}" -gt 0 ]; then
    return 1
  fi
}

# Verify metrics, logs, traces, and Grafana datasource provisioning.
skill_verify_observability() {
  local passed=0
  local failed=0

  _skill_check() {
    local name="$1"
    shift

    if "$@" >/tmp/skill_verify_observability.out 2>&1; then
      printf 'PASS %s\n' "${name}"
      passed=$((passed + 1))
    else
      printf 'FAIL %s\n' "${name}"
      sed 's/^/  /' /tmp/skill_verify_observability.out
      failed=$((failed + 1))
    fi
  }

  curl -fsS "${API_URL}/health" >/dev/null || true
  sleep 3

  _skill_check "Prometheus scraping" bash -c "curl -fsS '${PROMETHEUS_URL}/api/v1/query?query=up%7Bjob%3D%22food-delivery-api%22%7D' | grep -q '\"status\":\"success\"' && curl -fsS '${PROMETHEUS_URL}/api/v1/query?query=up%7Bjob%3D%22food-delivery-api%22%7D' | grep -q '\"1\"'"
  _skill_check "Loki receiving logs" bash -c "curl -G -fsS '${LOKI_URL}/loki/api/v1/query_range' --data-urlencode 'query={project=\"food-delivery-observability\",service=\"api\"}' --data-urlencode 'limit=5' | grep -q '\"streams\"'"
  _skill_check "Tempo receiving traces" bash -c "curl -G -fsS '${TEMPO_URL}/api/search' --data-urlencode 'tags=service.name=food-delivery-api' --data-urlencode 'limit=1' | grep -q '\"traceID\"'"
  _skill_check "Grafana datasources healthy" bash -c "curl -fsS -u admin:admin '${GRAFANA_URL}/api/datasources/uid/prometheus/health' | grep -Eq '\"status\":\"(OK|success)\"' && curl -fsS -u admin:admin '${GRAFANA_URL}/api/datasources/uid/loki/health' | grep -Eq '\"status\":\"(OK|success)\"' && curl -fsS -u admin:admin '${GRAFANA_URL}/api/datasources/uid/tempo' | grep -q '\"uid\":\"tempo\"' && for attempt in 1 2 3 4 5; do curl -fsS '${TEMPO_URL}/ready' | grep -q 'ready' && exit 0; sleep 3; done; exit 1"
  _skill_check "API metrics available" bash -c "curl -fsS '${API_URL}/metrics' | grep -q 'food_delivery_http_requests_total' && curl -fsS '${API_URL}/metrics' | grep -q 'food_delivery_database_query_duration_seconds' && curl -fsS '${API_URL}/metrics' | grep -q 'food_delivery_redis_operation_duration_seconds'"
  _skill_check "Structured logs working" bash -c "docker compose logs --no-color --tail=100 api | grep -q '\"message\":\"API request completed\"'"
  _skill_check "Trace IDs generated" bash -c "docker compose logs --no-color --tail=100 api | grep -Eq '\"traceId\":\"[a-f0-9]{32}\"'"

  printf '\nObservability verification summary: %d passed, %d failed\n' "${passed}" "${failed}"

  if [ "${failed}" -gt 0 ]; then
    return 1
  fi
}

if [ "$#" -eq 0 ]; then
  skill_help
else
  "$@"
fi
