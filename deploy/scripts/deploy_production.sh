#!/usr/bin/env bash
set -euo pipefail

# End-to-end production deployment helper for Ubuntu VPS.
# Usage:
#   ./deploy/scripts/deploy_production.sh /opt/camtraffic

ROOT_DIR="${1:-/opt/camtraffic}"
COMPOSE_FILE="${ROOT_DIR}/deploy/docker/docker-compose.prod.yml"
ENV_FILE="${ROOT_DIR}/.env.production"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}. Copy deploy/env/.env.production.example first." >&2
  exit 1
fi

echo "[1/4] Starting production stack..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up --build -d

echo "[2/4] Running Django migrations..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T backend python manage.py migrate --noinput

echo "[3/4] Seeding database..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T backend python manage.py seed_database

echo "[4/4] Running health checks..."
"${ROOT_DIR}/deploy/scripts/healthcheck_production.sh" "${ROOT_DIR}"

echo "Production deployment completed successfully."
