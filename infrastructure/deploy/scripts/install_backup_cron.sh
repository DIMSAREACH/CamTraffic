#!/usr/bin/env bash
# Install nightly Postgres + system backup cron (02:30 Asia/Phnom_Penh ≈ 19:30 UTC).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CRON_LINE="30 19 * * * cd $ROOT && bash deploy/scripts/backup_postgres.sh >> $ROOT/backend/logs/backup-cron.log 2>&1"

(crontab -l 2>/dev/null | grep -v 'backup_postgres.sh'; echo "$CRON_LINE") | crontab -

echo "Installed cron:"
echo "  $CRON_LINE"
