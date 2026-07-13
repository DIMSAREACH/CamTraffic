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

echo "==> Seeding demo environment (dev only — skip on public prod)..."
compose exec -T backend python manage.py seed_demo || compose exec -T backend python manage.py seed_data || true

echo "==> Production stack is up."
echo "    Admin: https://${DOMAIN_ADMIN:-admin.camtraffic.store}"
echo "    User:  https://${DOMAIN_USER:-app.camtraffic.store}"
echo "    API:   https://${DOMAIN_API:-api.camtraffic.store}"
echo "Next: point DNS A-records, then run deploy/ssl/certbot-init.sh"
