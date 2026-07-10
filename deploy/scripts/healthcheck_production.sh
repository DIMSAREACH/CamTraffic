#!/usr/bin/env bash
set -euo pipefail

# Verify production compose services and key health endpoints.
# Usage:
#   ./deploy/scripts/healthcheck_production.sh /opt/camtraffic

ROOT_DIR="${1:-/opt/camtraffic}"
COMPOSE_FILE="${ROOT_DIR}/deploy/docker/docker-compose.prod.yml"
ENV_FILE="${ROOT_DIR}/.env.production"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Env file not found: ${ENV_FILE}" >&2
  exit 1
fi

services=(postgres redis backend ai-service celery-worker celery-beat nginx)

echo "Checking service state..."
for s in "${services[@]}"; do
  state="$(docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps --format json "$s" | tr -d '\n' | sed -n 's/.*"State":"\([^"]*\)".*/\1/p')"
  if [[ -z "${state}" ]]; then
    echo "[FAIL] ${s}: not found"
    exit 1
  fi
  if [[ "${state}" != "running" ]]; then
    echo "[FAIL] ${s}: state=${state}"
    exit 1
  fi
  echo "[OK] ${s}: ${state}"
done

echo "Checking backend health endpoint..."
backend_code="$(docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T backend python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health/').getcode())")"
if [[ "${backend_code}" != "200" ]]; then
  echo "[FAIL] backend health code=${backend_code}"
  exit 1
fi

echo "Checking AI service health endpoint..."
ai_code="$(docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T ai-service python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8001/health').getcode())")"
if [[ "${ai_code}" != "200" ]]; then
  echo "[FAIL] ai-service health code=${ai_code}"
  exit 1
fi

echo "All production checks passed."
