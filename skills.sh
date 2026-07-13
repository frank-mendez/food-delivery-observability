#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="food-delivery-observability"
CURRENT_PHASE="Phase 3"
API_PACKAGE="@food-delivery/api"
API_DIR="apps/api"

DEFAULT_API_HOST_PORT=4000
DEFAULT_POSTGRES_HOST_PORT=5432
DEFAULT_REDIS_HOST_PORT=6379
DEFAULT_PROMETHEUS_HOST_PORT=9090
DEFAULT_GRAFANA_HOST_PORT=3000
DEFAULT_LOKI_HOST_PORT=3100
DEFAULT_TEMPO_HOST_PORT=3200
DEFAULT_ALLOY_HOST_PORT=12345
DEFAULT_ALLOY_OTLP_GRPC_HOST_PORT=4317
DEFAULT_ALLOY_OTLP_HTTP_HOST_PORT=4318
DEFAULT_CADVISOR_HOST_PORT=8081

_skill_env_value() {
  local name="$1"
  local default_value="$2"
  local value="${!name-}"

  if [ -n "${value}" ]; then
    printf '%s' "${value}"
    return 0
  fi

  if [ -f .env ]; then
    value="$(grep -E "^[[:space:]]*(export[[:space:]]+)?${name}[[:space:]]*=" .env 2>/dev/null | tail -n 1 | sed -E "s/^[[:space:]]*(export[[:space:]]+)?${name}[[:space:]]*=[[:space:]]*//; s/[[:space:]]+#.*$//; s/^['\\\"]//; s/['\\\"]$//" || true)"

    if [ -n "${value}" ]; then
      printf '%s' "${value}"
      return 0
    fi
  fi

  printf '%s' "${default_value}"
}

API_HOST_PORT="$(_skill_env_value API_HOST_PORT "${DEFAULT_API_HOST_PORT}")"
POSTGRES_HOST_PORT="$(_skill_env_value POSTGRES_HOST_PORT "${DEFAULT_POSTGRES_HOST_PORT}")"
REDIS_HOST_PORT="$(_skill_env_value REDIS_HOST_PORT "${DEFAULT_REDIS_HOST_PORT}")"
PROMETHEUS_HOST_PORT="$(_skill_env_value PROMETHEUS_HOST_PORT "${DEFAULT_PROMETHEUS_HOST_PORT}")"
GRAFANA_HOST_PORT="$(_skill_env_value GRAFANA_HOST_PORT "${DEFAULT_GRAFANA_HOST_PORT}")"
LOKI_HOST_PORT="$(_skill_env_value LOKI_HOST_PORT "${DEFAULT_LOKI_HOST_PORT}")"
TEMPO_HOST_PORT="$(_skill_env_value TEMPO_HOST_PORT "${DEFAULT_TEMPO_HOST_PORT}")"
ALLOY_HOST_PORT="$(_skill_env_value ALLOY_HOST_PORT "${DEFAULT_ALLOY_HOST_PORT}")"
ALLOY_OTLP_GRPC_HOST_PORT="$(_skill_env_value ALLOY_OTLP_GRPC_HOST_PORT "${DEFAULT_ALLOY_OTLP_GRPC_HOST_PORT}")"
ALLOY_OTLP_HTTP_HOST_PORT="$(_skill_env_value ALLOY_OTLP_HTTP_HOST_PORT "${DEFAULT_ALLOY_OTLP_HTTP_HOST_PORT}")"
CADVISOR_HOST_PORT="$(_skill_env_value CADVISOR_HOST_PORT "${DEFAULT_CADVISOR_HOST_PORT}")"

API_URL="${API_URL:-http://localhost:${API_HOST_PORT}}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:${PROMETHEUS_HOST_PORT}}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:${GRAFANA_HOST_PORT}}"
LOKI_URL="${LOKI_URL:-http://localhost:${LOKI_HOST_PORT}}"
TEMPO_URL="${TEMPO_URL:-http://localhost:${TEMPO_HOST_PORT}}"
ALLOY_URL="${ALLOY_URL:-http://localhost:${ALLOY_HOST_PORT}}"
CADVISOR_URL="${CADVISOR_URL:-http://localhost:${CADVISOR_HOST_PORT}}"

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

_skill_validate_port() {
  local port="$1"

  [[ "${port}" =~ ^[0-9]+$ ]] && [ "${port}" -ge 1 ] && [ "${port}" -le 65535 ]
}

_skill_port_in_use() {
  local port="$1"

  if command -v ss >/dev/null 2>&1; then
    ss -H -ltn "( sport = :${port} )" | grep -q .
    return $?
  fi

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi

  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "${port}" >/dev/null 2>&1
    return $?
  fi

  return 2
}

_skill_suggest_port() {
  local port="$1"
  local candidate=$((port + 10000))

  while _skill_port_in_use "${candidate}" >/dev/null 2>&1; do
    candidate=$((candidate + 1))
  done

  printf '%s' "${candidate}"
}

_skill_tcp_reachable() {
  local port="$1"

  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "${port}" >/dev/null 2>&1
    return $?
  fi

  if command -v timeout >/dev/null 2>&1; then
    timeout 2 bash -c "true < /dev/tcp/127.0.0.1/${port}" >/dev/null 2>&1
    return $?
  fi

  bash -c "true < /dev/tcp/127.0.0.1/${port}" >/dev/null 2>&1
}

_skill_compose_port_mapping() {
  local service="$1"
  local host_port="$2"
  local container_port="$3"

  docker compose config | awk \
    -v service_line="  ${service}:" \
    -v target_line="target: ${container_port}" \
    -v published_line="published: \"${host_port}\"" '
      $0 == service_line {
        in_service = 1
        found_target = 0
        found = 0
        next
      }

      in_service && $0 ~ /^  [[:alnum:]_-]+:/ {
        exit(found ? 0 : 1)
      }

      in_service && index($0, target_line) {
        found_target = 1
      }

      in_service && found_target && index($0, published_line) {
        found = 1
        exit 0
      }

      END {
        exit(found ? 0 : 1)
      }
    '
}

_skill_port_rows() {
  cat <<PORTS
API|api|API_HOST_PORT|${API_HOST_PORT}|4000|${API_URL}
PostgreSQL|postgres|POSTGRES_HOST_PORT|${POSTGRES_HOST_PORT}|5432|localhost:${POSTGRES_HOST_PORT}
Redis|redis|REDIS_HOST_PORT|${REDIS_HOST_PORT}|6379|localhost:${REDIS_HOST_PORT}
Prometheus|prometheus|PROMETHEUS_HOST_PORT|${PROMETHEUS_HOST_PORT}|9090|${PROMETHEUS_URL}
Grafana|grafana|GRAFANA_HOST_PORT|${GRAFANA_HOST_PORT}|3000|${GRAFANA_URL}
Loki|loki|LOKI_HOST_PORT|${LOKI_HOST_PORT}|3100|${LOKI_URL}
Tempo|tempo|TEMPO_HOST_PORT|${TEMPO_HOST_PORT}|3200|${TEMPO_URL}
Alloy UI|alloy|ALLOY_HOST_PORT|${ALLOY_HOST_PORT}|12345|${ALLOY_URL}
Alloy OTLP gRPC|alloy|ALLOY_OTLP_GRPC_HOST_PORT|${ALLOY_OTLP_GRPC_HOST_PORT}|4317|localhost:${ALLOY_OTLP_GRPC_HOST_PORT}
Alloy OTLP HTTP|alloy|ALLOY_OTLP_HTTP_HOST_PORT|${ALLOY_OTLP_HTTP_HOST_PORT}|4318|localhost:${ALLOY_OTLP_HTTP_HOST_PORT}
cAdvisor|cadvisor|CADVISOR_HOST_PORT|${CADVISOR_HOST_PORT}|8080|${CADVISOR_URL}
PORTS
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
PostgreSQL: localhost:${POSTGRES_HOST_PORT} (container: postgres:5432)
Redis: localhost:${REDIS_HOST_PORT} (container: redis:6379)
INFO
}

# Print effective host-published ports and stable container ports.
skill_ports() {
  printf '%-18s %-28s %-10s %-14s %s\n' "Service" "Variable" "Host" "Container" "Host URL"
  printf '%-18s %-28s %-10s %-14s %s\n' "-------" "--------" "----" "---------" "--------"

  while IFS='|' read -r service compose_service variable host_port container_port url; do
    printf '%-18s %-28s %-10s %-14s %s\n' "${service}" "${variable}" "${host_port}" "${container_port}" "${url}"
  done < <(_skill_port_rows)
}

# Warn when configured host ports are already occupied before starting Compose.
skill_check_ports() {
  local service compose_service variable host_port container_port url
  local failed=0
  local skipped=0
  local suggestion
  local status

  while IFS='|' read -r service compose_service variable host_port container_port url; do
    if ! _skill_validate_port "${host_port}"; then
      printf 'WARN %s has invalid host port "%s". Set %s to a number from 1 to 65535.\n' "${service}" "${host_port}" "${variable}"
      failed=$((failed + 1))
      continue
    fi

    if _skill_port_in_use "${host_port}"; then
      suggestion="$(_skill_suggest_port "${host_port}")"
      printf 'WARN %s host port %s is already in use. Set %s=%s in .env.\n' "${service}" "${host_port}" "${variable}" "${suggestion}"
      failed=$((failed + 1))
      continue
    else
      status=$?
    fi

    case "${status}" in
      2)
        printf 'SKIP %s host port %s could not be checked because ss, lsof, and nc are unavailable.\n' "${service}" "${host_port}"
        skipped=$((skipped + 1))
        ;;
      *)
        printf 'OK   %s host port %s is available.\n' "${service}" "${host_port}"
        ;;
    esac
  done < <(_skill_port_rows)

  if [ "${failed}" -gt 0 ]; then
    printf '\nPort check summary: %d warning(s), %d skipped\n' "${failed}" "${skipped}"
    return 1
  fi

  printf '\nPort check summary: all configured host ports available, %d skipped\n' "${skipped}"
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
  skill_check_ports || true
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
  skill_check_ports || true
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

# Verify configured host port mappings, host reachability, and stable internal ports.
skill_verify_ports() {
  local passed=0
  local failed=0
  local service compose_service variable host_port container_port url

  _run_check() {
    if _skill_check "$@"; then
      passed=$((passed + 1))
    else
      failed=$((failed + 1))
    fi
  }

  _run_check "Docker Compose config valid" docker compose config --quiet

  while IFS='|' read -r service compose_service variable host_port container_port url; do
    _run_check "${service} mapping ${host_port}:${container_port}" _skill_compose_port_mapping "${compose_service}" "${host_port}" "${container_port}"
  done < <(_skill_port_rows)

  _run_check "API uses internal PostgreSQL service port" bash -c "docker compose config | grep -q 'postgres:5432'"
  _run_check "API uses internal Redis service port" bash -c "docker compose config | grep -q 'REDIS_HOST: redis' && docker compose config | grep -q 'REDIS_PORT: \"6379\"'"
  _run_check "API exports traces to internal Alloy OTLP endpoint" bash -c "docker compose config | grep -q 'OTEL_EXPORTER_OTLP_ENDPOINT: http://alloy:4318'"

  while IFS='|' read -r service compose_service variable host_port container_port url; do
    _run_check "${service} host port reachable" _skill_tcp_reachable "${host_port}"
  done < <(_skill_port_rows)

  printf '\nPort verification summary: %d passed, %d failed\n' "${passed}" "${failed}"

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
