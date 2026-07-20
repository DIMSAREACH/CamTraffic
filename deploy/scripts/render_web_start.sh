#!/bin/sh
# CamTraffic API — Render / Docker web boot (migrate, demo logins, gunicorn)
set -eu

cd /app/backend

python manage.py migrate --noinput
python manage.py collectstatic --noinput

if [ "${CAMTRAFFIC_SYNC_DEMO_ACCOUNTS:-true}" = "true" ]; then
  python manage.py seed_demo --accounts-only --reset-passwords
fi

exec gunicorn -c /app/deploy/gunicorn/gunicorn.conf.py camtraffic.wsgi:application
