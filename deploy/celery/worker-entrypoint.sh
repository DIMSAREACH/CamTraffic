#!/bin/sh
set -e

echo "Waiting for Redis..."
until python -c "
import os, sys
import redis

try:
    client = redis.from_url(os.environ.get('REDIS_URL', 'redis://redis:6379/0'), socket_connect_timeout=2)
    client.ping()
except Exception:
    sys.exit(1)
" 2>/dev/null; do
  sleep 2
done
echo "Redis is ready."

exec "$@"
