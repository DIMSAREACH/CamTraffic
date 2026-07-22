#!/bin/sh
# CamTraffic API — Render / Docker web boot (migrate, optional demo, gunicorn)
set -eu

cd /app/backend

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Production-safe defaults: demo accounts OFF.
# Defense/demo hosts only: CAMTRAFFIC_SYNC_DEMO_ACCOUNTS=true ALLOW_DEMO_SEED=true
if [ "${CAMTRAFFIC_SYNC_DEMO_ACCOUNTS:-false}" = "true" ]; then
  export ALLOW_DEMO_SEED="${ALLOW_DEMO_SEED:-true}"
  if [ "${CAMTRAFFIC_SEED_DEMO_DATA:-false}" = "true" ]; then
    python manage.py seed_demo --force --reset-passwords || {
      echo "WARN: seed_demo failed — retrying accounts-only."
      python manage.py seed_demo --force --accounts-only --reset-passwords || {
        echo "WARN: seed_demo accounts-only failed; continuing."
      }
    }
  else
    python manage.py seed_demo --force --accounts-only --reset-passwords || {
      echo "WARN: seed_demo failed — demo logins may be missing; continuing."
    }
  fi
fi

# Idempotent; needed for AI → violation mapping.
python manage.py seed_violation_rules || {
  echo "WARN: seed_violation_rules failed; continuing."
}

# Optional RBAC permission catalog for Admin → Roles page.
if [ "${CAMTRAFFIC_BACKFILL_RBAC:-true}" = "true" ]; then
  python manage.py backfill_erd_alignment || {
    echo "WARN: backfill_erd_alignment failed; continuing."
  }
fi

if ! python manage.py bootstrap_admin_env; then
  echo "WARN: bootstrap_admin_env failed — check CAMTRAFFIC_BOOTSTRAP_ADMIN_*; continuing."
fi

exec gunicorn -c /app/deploy/gunicorn/gunicorn.conf.py camtraffic.wsgi:application
