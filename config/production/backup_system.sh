#!/bin/bash
# CamTraffic automated backup script
set -e

BACKUP_DIR="/var/backups/camtraffic"
PROJECT_DIR="/opt/camtraffic"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR/database" "$BACKUP_DIR/files" "$BACKUP_DIR/logs"

echo "🗄️  Starting CamTraffic backup - $DATE"

# Database backup
echo "📦 Backing up database..."
cd $PROJECT_DIR
python manage.py backup_database --backup --backup-dir "$BACKUP_DIR/database" --compress

# Application files backup (excluding logs and cache)
echo "📁 Backing up application files..."
tar -czf "$BACKUP_DIR/files/camtraffic_files_$DATE.tar.gz" \
    --exclude="*.log" \
    --exclude="__pycache__" \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude="media/cache" \
    -C /opt camtraffic

# Log files backup
echo "📋 Backing up logs..."
tar -czf "$BACKUP_DIR/logs/camtraffic_logs_$DATE.tar.gz" /var/log/camtraffic/

# Cleanup old backups
echo "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup completed successfully"

# Send notification
curl -X POST https://api.camtraffic.store/webhooks/backup-completed \
    -H "Content-Type: application/json" \
    -d '{"status": "success", "timestamp": "'$(date -Iseconds)'", "backup_dir": "'$BACKUP_DIR'"}'
