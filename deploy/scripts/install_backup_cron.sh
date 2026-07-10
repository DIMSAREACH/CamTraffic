#!/usr/bin/env bash
set -euo pipefail

# Install daily DB backup cron for CamTraffic production.
# Usage:
#   sudo ./deploy/scripts/install_backup_cron.sh /opt/camtraffic /opt/camtraffic/backups "0 2 * * *"

ROOT_DIR="${1:-/opt/camtraffic}"
BACKUP_DIR="${2:-${ROOT_DIR}/backups}"
CRON_EXPR="${3:-0 2 * * *}"
SCRIPT_PATH="${ROOT_DIR}/deploy/scripts/backup_postgres.sh"
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "${BACKUP_DIR}"

CRON_LINE="${CRON_EXPR} ${SCRIPT_PATH} ${ROOT_DIR} ${BACKUP_DIR} >> ${LOG_FILE} 2>&1"

# Idempotent install: remove old line for this script, then append new one.
( crontab -l 2>/dev/null | grep -v "${SCRIPT_PATH}"; echo "${CRON_LINE}" ) | crontab -

echo "Installed cron job: ${CRON_LINE}"
crontab -l | grep "${SCRIPT_PATH}" || true
