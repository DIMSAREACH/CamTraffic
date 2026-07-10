#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until python -c "
import os, sys
import psycopg2

try:
    psycopg2.connect(
        dbname=os.environ.get('POSTGRES_DB', 'camtraffic_db'),
        user=os.environ.get('POSTGRES_USER', 'camtraffic'),
        password=os.environ.get('POSTGRES_PASSWORD', 'camtraffic'),
        host=os.environ.get('POSTGRES_HOST', 'postgres'),
        port=os.environ.get('POSTGRES_PORT', '5432'),
    )
except Exception:
    sys.exit(1)
" 2>/dev/null; do
  sleep 2
done
echo "PostgreSQL is ready."

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec "$@"
