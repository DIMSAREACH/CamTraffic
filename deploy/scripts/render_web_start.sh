#!/bin/sh
# CamTraffic API — Render / Docker web boot (migrate, demo data, gunicorn)
set -eu

cd /app/backend

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Demo logins + sample rows so Admin / Officer / Driver portals are usable on first boot.
# Set CAMTRAFFIC_SEED_DEMO_DATA=false to sync accounts only (faster cold start).
if [ "${CAMTRAFFIC_SYNC_DEMO_ACCOUNTS:-true}" = "true" ]; then
  if [ "${CAMTRAFFIC_SEED_DEMO_DATA:-true}" = "true" ]; then
    python manage.py seed_demo --reset-passwords || {
      echo "WARN: seed_demo failed — retrying accounts-only."
      python manage.py seed_demo --accounts-only --reset-passwords || {
        echo "WARN: seed_demo accounts-only failed; continuing."
      }
    }
  else
    python manage.py seed_demo --accounts-only --reset-passwords || {
      echo "WARN: seed_demo failed — demo logins may be missing; continuing."
    }
  fi
fi

# Idempotent; needed for AI → violation mapping even when seed_demo is accounts-only.
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
