#!/usr/bin/env bash
# Build and start CamTraffic production stack; optional seed.
set -euo pipefail

# shellcheck source=_compose.sh
source "$(dirname "$0")/_compose.sh"
init_compose_env

cd "$ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Creating $ENV_FILE from example — edit secrets before public deploy."
  cp "$ROOT/deploy/env/.env.production.example" "$ENV_FILE"
fi

echo "==> Building and starting 8 services..."
compose up -d --build

echo "==> Waiting for backend health..."
for _ in $(seq 1 30); do
  if compose exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/')" 2>/dev/null; then
    break
  fi
  sleep 2
done

# Production default: do NOT seed demo accounts (public known password).
# Opt-in only: CAMTRAFFIC_SEED_DEMO=true ALLOW_DEMO_SEED=true
if [[ "${CAMTRAFFIC_SEED_DEMO:-false}" == "true" ]]; then
  echo "==> Seeding demo environment (opt-in — not for public production)..."
  compose exec -T -e ALLOW_DEMO_SEED=true backend python manage.py seed_demo --force \
    || compose exec -T backend python manage.py seed_violation_rules || true
else
  echo "==> Skipping seed_demo (production-safe). Seed violation rules only..."
  compose exec -T backend python manage.py seed_violation_rules || true
  compose exec -T backend python manage.py bootstrap_admin_env || true
fi

echo "==> Production stack is up."
echo "    Admin: https://${DOMAIN_ADMIN:-admin.camtraffic.store}"
echo "    User:  https://${DOMAIN_USER:-app.camtraffic.store}  (/officer + /citizen)"
echo "    API:   https://${DOMAIN_API:-api.camtraffic.store}"
echo "Next: point DNS A-records, then run deploy/ssl/certbot-init.sh"
