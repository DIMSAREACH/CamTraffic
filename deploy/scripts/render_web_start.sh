#!/bin/sh
# CamTraffic API — Render / Docker web boot (migrate, demo logins, gunicorn)
set -eu

cd /app/backend

python manage.py migrate --noinput
python manage.py collectstatic --noinput

if [ "${CAMTRAFFIC_SYNC_DEMO_ACCOUNTS:-true}" = "true" ]; then
  python manage.py seed_demo --accounts-only --reset-passwords || {
    echo "WARN: seed_demo failed — demo logins may be missing; continuing."
  }
fi

if ! python manage.py bootstrap_admin_env; then
  echo "WARN: bootstrap_admin_env failed — check CAMTRAFFIC_BOOTSTRAP_ADMIN_*; continuing."
fi

exec gunicorn -c /app/deploy/gunicorn/gunicorn.conf.py camtraffic.wsgi:application
