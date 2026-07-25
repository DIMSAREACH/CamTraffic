#!/bin/bash
# CamTraffic health monitoring script
set -e

API_URL="https://api.camtraffic.store"
HEALTH_ENDPOINT="/health/ready/"
TIMEOUT=10
LOG_FILE="/var/log/camtraffic/health_check.log"

# Function to log with timestamp
log_with_timestamp() {
    echo "[$(date -Iseconds)] $1" >> $LOG_FILE
}

# Check API health
check_api_health() {
    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$API_URL$HEALTH_ENDPOINT" || echo "000")
    
    if [ "$response_code" = "200" ]; then
        log_with_timestamp "✅ API health check passed"
        return 0
    else
        log_with_timestamp "❌ API health check failed (HTTP $response_code)"
        return 1
    fi
}

# Check database connectivity
check_database() {
    cd /opt/camtraffic
    python manage.py check --database default > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        log_with_timestamp "✅ Database connection healthy"
        return 0
    else
        log_with_timestamp "❌ Database connection failed"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    local usage
    usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$usage" -lt 90 ]; then
        log_with_timestamp "✅ Disk usage: ${usage}%"
        return 0
    else
        log_with_timestamp "⚠️  High disk usage: ${usage}%"
        return 1
    fi
}

# Main health check
main() {
    local failed_checks=0
    
    check_api_health || ((failed_checks++))
    check_database || ((failed_checks++))
    check_disk_space || ((failed_checks++))
    
    if [ $failed_checks -eq 0 ]; then
        log_with_timestamp "🎉 All health checks passed"
        exit 0
    else
        log_with_timestamp "❌ $failed_checks health checks failed"
        exit 1
    fi
}

main "$@"
