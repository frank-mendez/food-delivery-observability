#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="food-delivery-observability"
CURRENT_PHASE="Phase 3"
API_PACKAGE="@food-delivery/api"
API_DIR="apps/api"
API_URL="${API_URL:-http://localhost:4000}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
LOKI_URL="${LOKI_URL:-http://localhost:3100}"
TEMPO_URL="${TEMPO_URL:-http://localhost:3200}"
ALLOY_URL="${ALLOY_URL:-http://localhost:12345}"
CADVISOR_URL="${CADVISOR_URL:-http://localhost:8081}"

_skill_check() {
  local name="$1"
  shift

  if "$@" >/tmp/skill_check.out 2>&1; then
    printf 'PASS %s\n' "${name}"
    return 0
  fi

  printf 'FAIL %s\n' "${name}"
  sed 's/^/  /' /tmp/skill_check.out
  return 1
}

# List all available helper commands.
skill_help() {
  compgen -A function skill_ | sort
}

# Print project identity, stack, workspace packages, and important local URLs.
skill_info() {
  cat <<INFO
Project: ${PROJECT_NAME}
Current phase: ${CURRENT_PHASE}
Workspace: pnpm monorepo
API package: ${API_PACKAGE} (${API_DIR})
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
    tree -a -I 'node_modules|dist|coverage|.git|.next|test-results|playwright-report'
  else
    find . \
      -path './node_modules' -prune -o \
      -path './*/node_modules' -prune -o \
      -path './dist' -prune -o \
      -path './*/dist' -prune -o \
      -path './coverage' -prune -o \
      -path './*/coverage' -prune -o \
      -path './.git' -prune -o \
      -maxdepth 5 -print | sort
  fi
}

# Show workspace packages recognized by pnpm.
skill_workspace() {
  pnpm -r list --depth -1
}

# Install workspace dependencies.
skill_install() {
  pnpm install
}

# Run the NestJS API locally in watch mode.
skill_api() {
  skill_dev_api
}

skill_dev_api() {
  pnpm --filter "${API_PACKAGE}" dev
}

skill_build_api() {
  pnpm --filter "${API_PACKAGE}" build
}

skill_test_api() {
  pnpm --filter "${API_PACKAGE}" test
}

skill_test() {
  skill_test_api
}

skill_test_watch() {
  pnpm --filter "${API_PACKAGE}" test:watch
}

skill_test_cov() {
  pnpm --filter "${API_PACKAGE}" test:cov
}

skill_lint() {
  pnpm --filter "${API_PACKAGE}" lint
}

skill_typecheck() {
  pnpm --filter "${API_PACKAGE}" typecheck
}

skill_format() {
  pnpm --filter "${API_PACKAGE}" format
}

skill_prisma_generate() {
  pnpm --filter "${API_PACKAGE}" prisma:generate
}

skill_prisma_migrate() {
  pnpm --filter "${API_PACKAGE}" prisma:migrate
}

skill_prisma_migrate_deploy() {
  pnpm --filter "${API_PACKAGE}" prisma:migrate:deploy
}

skill_prisma_seed() {
  pnpm --filter "${API_PACKAGE}" prisma:seed
}

skill_prisma_reset() {
  pnpm --filter "${API_PACKAGE}" prisma:reset
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

# Rebuild the API image from scratch and start the stack.
skill_rebuild() {
  docker compose build --no-cache api
  docker compose up -d
}

# Tail logs for all services.
skill_logs() {
  docker compose logs -f
}

skill_logs_api() {
  docker compose logs -f api
}

skill_logs_db() {
  docker compose logs -f postgres
}

skill_logs_grafana() {
  docker compose logs -f grafana
}

skill_logs_prometheus() {
  docker compose logs -f prometheus
}

skill_logs_loki() {
  docker compose logs -f loki
}

skill_logs_tempo() {
  docker compose logs -f tempo
}

skill_logs_alloy() {
  docker compose logs -f alloy
}

# Open a PostgreSQL shell in the app database.
skill_db_shell() {
  docker compose exec postgres psql -U food_delivery -d food_delivery
}

# Open a shell inside the API container.
skill_shell() {
  docker compose exec api sh
}

# Remove containers, volumes, build output, and coverage output.
skill_clean() {
  docker compose down -v --remove-orphans
  rm -rf coverage "${API_DIR}/dist" "${API_DIR}/tsconfig.build.tsbuildinfo"
}

# Fetch the health endpoint.
skill_health() {
  curl -fsS "${API_URL}/health"
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

skill_prometheus() {
  curl -fsS "${PROMETHEUS_URL}/-/ready"
  printf '\n%s\n' "${PROMETHEUS_URL}"
}

skill_loki() {
  curl -fsS "${LOKI_URL}/ready"
  printf '\n%s\n' "${LOKI_URL}"
}

skill_tempo() {
  curl -fsS "${TEMPO_URL}/ready"
  printf '\n%s\n' "${TEMPO_URL}"
}

skill_alloy() {
  curl -fsS "${ALLOY_URL}/-/ready"
  printf '\n%s\n' "${ALLOY_URL}"
}

skill_grafana() {
  curl -fsS "${GRAFANA_URL}/api/health"
  printf '\n%s\n' "${GRAFANA_URL}"
}

skill_dashboards() {
  curl -fsS -u admin:admin "${GRAFANA_URL}/api/search?query=Food%20Delivery"
}

# Verify the monorepo shape and local API package commands.
skill_verify_workspace() {
  local passed=0
  local failed=0

  _run_check() {
    if _skill_check "$@"; then
      passed=$((passed + 1))
    else
      failed=$((failed + 1))
    fi
  }

  _run_check "pnpm workspace file" test -f pnpm-workspace.yaml
  _run_check "API package exists" test -f "${API_DIR}/package.json"
  _run_check "API package discoverable" bash -c "pnpm -r list --depth -1 | grep -q '${API_PACKAGE}'"
  _run_check "Install state valid" bash -c "pnpm --filter '${API_PACKAGE}' exec node -e \"require('@nestjs/core'); require('@prisma/client')\""
  _run_check "API build passes" pnpm --filter "${API_PACKAGE}" build
  _run_check "API tests pass" pnpm --filter "${API_PACKAGE}" test
  _run_check "Docker Compose config valid" docker compose config --quiet
  _run_check "Expected files present" test -f "${API_DIR}/Dockerfile"
  _run_check "Infrastructure paths present" test -f infrastructure/prometheus/prometheus.yml

  printf '\nWorkspace verification summary: %d passed, %d failed\n' "${passed}" "${failed}"

  if [ "${failed}" -gt 0 ]; then
    return 1
  fi
}

# Verify PostgreSQL, Redis, API health, Prometheus scraping, and Grafana.
skill_verify() {
  local passed=0
  local failed=0

  _run_check() {
    if _skill_check "$@"; then
      passed=$((passed + 1))
    else
      failed=$((failed + 1))
    fi
  }

  _run_check "PostgreSQL connectivity" docker compose exec -T postgres pg_isready -U food_delivery -d food_delivery
  _run_check "Redis connectivity" bash -c "docker compose exec -T redis redis-cli ping | grep -q PONG"
  _run_check "NestJS health endpoint" bash -c "curl -fsS '${API_URL}/health' | grep -q '\"status\":\"ok\"'"
  _run_check "Prometheus scraping" bash -c "curl -fsS '${PROMETHEUS_URL}/api/v1/query?query=up%7Bjob%3D%22food-delivery-api%22%7D' | grep -q '\"status\":\"success\"'"
  _run_check "Grafana availability" bash -c "curl -fsS '${GRAFANA_URL}/api/health' | grep -q '\"database\"'"

  printf '\nVerification summary: %d passed, %d failed\n' "${passed}" "${failed}"

  if [ "${failed}" -gt 0 ]; then
    return 1
  fi
}

# Verify metrics, logs, traces, and Grafana datasource provisioning.
skill_verify_observability() {
  local passed=0
  local failed=0

  _run_check() {
    if _skill_check "$@"; then
      passed=$((passed + 1))
    else
      failed=$((failed + 1))
    fi
  }

  curl -fsS "${API_URL}/health" >/dev/null || true
  sleep 3

  _run_check "Prometheus scraping" bash -c "curl -fsS '${PROMETHEUS_URL}/api/v1/query?query=up%7Bjob%3D%22food-delivery-api%22%7D' | grep -q '\"status\":\"success\"' && curl -fsS '${PROMETHEUS_URL}/api/v1/query?query=up%7Bjob%3D%22food-delivery-api%22%7D' | grep -q '\"1\"'"
  _run_check "Loki receiving logs" bash -c "curl -G -fsS '${LOKI_URL}/loki/api/v1/query_range' --data-urlencode 'query={project=\"food-delivery-observability\",service=\"api\"}' --data-urlencode 'limit=5' | grep -q '\"streams\"'"
  _run_check "Tempo receiving traces" bash -c "curl -G -fsS '${TEMPO_URL}/api/search' --data-urlencode 'tags=service.name=food-delivery-api' --data-urlencode 'limit=1' | grep -q '\"traceID\"'"
  _run_check "Grafana datasources healthy" bash -c "curl -fsS -u admin:admin '${GRAFANA_URL}/api/datasources/uid/prometheus/health' | grep -Eq '\"status\":\"(OK|success)\"' && curl -fsS -u admin:admin '${GRAFANA_URL}/api/datasources/uid/loki/health' | grep -Eq '\"status\":\"(OK|success)\"' && curl -fsS -u admin:admin '${GRAFANA_URL}/api/datasources/uid/tempo' | grep -q '\"uid\":\"tempo\"' && for attempt in 1 2 3 4 5; do curl -fsS '${TEMPO_URL}/ready' | grep -q 'ready' && exit 0; sleep 3; done; exit 1"
  _run_check "API metrics available" bash -c "curl -fsS '${API_URL}/metrics' | grep -q 'food_delivery_http_requests_total' && curl -fsS '${API_URL}/metrics' | grep -q 'food_delivery_database_query_duration_seconds' && curl -fsS '${API_URL}/metrics' | grep -q 'food_delivery_redis_operation_duration_seconds'"
  _run_check "Structured logs working" bash -c "docker compose logs --no-color --tail=100 api | grep -q '\"message\":\"API request completed\"'"
  _run_check "Trace IDs generated" bash -c "docker compose logs --no-color --tail=100 api | grep -Eq '\"traceId\":\"[a-f0-9]{32}\"'"

  printf '\nObservability verification summary: %d passed, %d failed\n' "${passed}" "${failed}"

  if [ "${failed}" -gt 0 ]; then
    return 1
  fi
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  if [ "$#" -eq 0 ]; then
    skill_help
  else
    "$@"
  fi
fi
