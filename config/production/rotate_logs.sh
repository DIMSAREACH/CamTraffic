#!/bin/bash
# CamTraffic log rotation and cleanup
set -e

LOG_DIR="/var/log/camtraffic"
RETENTION_DAYS=30

echo "🗂️  Rotating CamTraffic logs..."

# Rotate application logs
find $LOG_DIR -name "*.log" -type f -mtime +$RETENTION_DAYS -delete

# Compress old logs
find $LOG_DIR -name "*.log.*" -type f ! -name "*.gz" -mtime +1 -exec gzip {} \;

# Clean up old compressed logs
find $LOG_DIR -name "*.log.*.gz" -type f -mtime +$RETENTION_DAYS -delete

echo "✅ Log rotation completed"
