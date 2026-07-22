#!/usr/bin/env bash
# Restore PostgreSQL from a gzipped pg_dump created by backup_postgres.sh
# Usage:
#   ./deploy/scripts/restore_postgres.sh backend/backups/pg-backup-YYYYMMDD-HHMMSS.sql.gz
set -euo pipefail

# shellcheck source=_compose.sh
source "$(dirname "$0")/_compose.sh"
init_compose_env

cd "$ROOT"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <path-to-pg-backup.sql.gz>"
  echo "Example: $0 backend/backups/pg-backup-20260722-120000.sql.gz"
  exit 1
fi

FILE="$1"
if [[ ! -f "$FILE" ]]; then
  echo "ERROR: backup file not found: $FILE"
  exit 1
fi

DB_NAME="${DB_NAME:-camtraffic_db}"
DB_USER="${DB_USER:-camtraffic}"

echo "WARNING: This will DROP and recreate schema objects in database '$DB_NAME'."
echo "File: $FILE"
read -r -p "Type YES to continue: " CONFIRM
if [[ "$CONFIRM" != "YES" ]]; then
  echo "Aborted."
  exit 1
fi

echo "==> Stopping writers (celery)…"
compose stop celery-worker celery-beat ai-worker || true

echo "==> Restoring dump…"
# Drop connections then restore
compose exec -T postgres psql -U "$DB_USER" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();" \
  || true

gunzip -c "$FILE" | compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME"

echo "==> Running migrations (idempotent)…"
compose start celery-worker celery-beat ai-worker || true
compose exec -T backend python manage.py migrate --noinput

echo "Restore complete. Verify: curl -fsS https://${DOMAIN_API:-api.camtraffic.store}/health/ready/"
