#!/usr/bin/env bash
set -euo pipefail

# Daily PostgreSQL backup for CamTraffic production stack.
# Usage:
#   ./deploy/scripts/backup_postgres.sh /opt/camtraffic /opt/camtraffic/backups

ROOT_DIR="${1:-/opt/camtraffic}"
BACKUP_DIR="${2:-${ROOT_DIR}/backups}"
COMPOSE_FILE="${ROOT_DIR}/deploy/docker/docker-compose.prod.yml"
ENV_FILE="${ROOT_DIR}/.env.production"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "${BACKUP_DIR}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="${BACKUP_DIR}/camtraffic-db-${TIMESTAMP}.sql.gz"

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "Compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Env file not found: ${ENV_FILE}" >&2
  exit 1
fi

# Load DB variables from production env.
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

if [[ -z "${POSTGRES_DB:-}" || -z "${POSTGRES_USER:-}" ]]; then
  echo "POSTGRES_DB/POSTGRES_USER missing in ${ENV_FILE}" >&2
  exit 1
fi

# Use the postgres container's pg_dump and stream to compressed host backup file.
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" | gzip > "${OUT_FILE}"

# Remove old backups by retention window.
find "${BACKUP_DIR}" -type f -name "camtraffic-db-*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "Backup completed: ${OUT_FILE}"
