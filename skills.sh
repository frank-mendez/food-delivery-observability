#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="food-delivery-observability"
CURRENT_PHASE="Phase 1"
API_URL="${API_URL:-http://localhost:4000}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"

# List all available helper commands.
skill_help() {
  compgen -A function skill_ | sort
}

# Print project identity, stack, and important local URLs.
skill_info() {
  cat <<INFO
Project: ${PROJECT_NAME}
Current phase: ${CURRENT_PHASE}
Stack: NestJS, TypeScript, Prisma, PostgreSQL, Redis, Docker Compose, Prometheus, Grafana
API: ${API_URL}
Grafana: ${GRAFANA_URL} (admin/admin)
Prometheus: ${PROMETHEUS_URL}
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

# Fetch the health endpoint.
skill_health() {
  curl -fsS "${API_URL}/health"
}

# Check Prometheus readiness and print its URL.
skill_prometheus() {
  curl -fsS "${PROMETHEUS_URL}/-/ready"
  printf '\n%s\n' "${PROMETHEUS_URL}"
}

# Check Grafana health and print its URL.
skill_grafana() {
  curl -fsS "${GRAFANA_URL}/api/health"
  printf '\n%s\n' "${GRAFANA_URL}"
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

if [ "$#" -eq 0 ]; then
  skill_help
else
  "$@"
fi
