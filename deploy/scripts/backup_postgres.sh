#!/usr/bin/env bash
# PostgreSQL logical backup to backend/backups volume.
set -euo pipefail

# shellcheck source=_compose.sh
source "$(dirname "$0")/_compose.sh"
init_compose_env

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$ROOT/backend/backups"

mkdir -p "$OUT_DIR"
cd "$ROOT"

DB_NAME="${DB_NAME:-camtraffic_db}"
DB_USER="${DB_USER:-camtraffic}"
FILE="$OUT_DIR/pg-backup-${STAMP}.sql.gz"

echo "==> Dumping PostgreSQL to $FILE"
compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FILE"

echo "==> Running Django system backup (media + manifest)..."
compose exec -T backend python manage.py backup_system || true

echo "Backup complete: $FILE"
