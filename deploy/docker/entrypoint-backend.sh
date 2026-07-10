#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
attempt=0
until python -c "
import os, sys
import psycopg2

in_docker = os.path.exists('/.dockerenv') or os.environ.get('CAMTRAFFIC_DOCKER', '').lower() in ('true', '1', 'yes')
port = os.environ.get('POSTGRES_INTERNAL_PORT', '5432') if in_docker else os.environ.get('POSTGRES_PORT', '5434')

try:
    psycopg2.connect(
        dbname=os.environ.get('POSTGRES_DB', 'camtraffic_db'),
        user=os.environ.get('POSTGRES_USER', 'camtraffic'),
        password=os.environ.get('POSTGRES_PASSWORD', 'camtraffic'),
        host=os.environ.get('POSTGRES_HOST', 'postgres'),
        port=port,
    )
except Exception as exc:
    print(f'PostgreSQL not ready: {exc}', file=sys.stderr)
    sys.exit(1)
"; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "PostgreSQL did not become ready in time. Check POSTGRES_PASSWORD matches the initialized database volume, or run: docker compose down -v" >&2
    exit 1
  fi
  sleep 2
done
echo "PostgreSQL is ready."

python manage.py migrate --noinput

exec "$@"
