#!/usr/bin/env bash
# Obtain Let's Encrypt certificates (run once on VPS after DNS A-records point to server).
set -euo pipefail

# shellcheck source=../scripts/_compose.sh
source "$(dirname "$0")/../scripts/_compose.sh"
init_compose_env

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

DOMAIN_ADMIN="${DOMAIN_ADMIN:-admin.camtraffic.store}"
DOMAIN_USER="${DOMAIN_USER:-app.camtraffic.store}"
DOMAIN_API="${DOMAIN_API:-api.camtraffic.store}"
DOMAIN_WWW="${DOMAIN_WWW:-www.camtraffic.store}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@camtraffic.store}"

cd "$ROOT"

compose run --rm certbot \
  certbot certonly --webroot \
  -w /var/www/certbot \
  --email "$CERTBOT_EMAIL" \
  --agree-tos --no-eff-email \
  -d "$DOMAIN_ADMIN" \
  -d "$DOMAIN_USER" \
  -d "$DOMAIN_API" \
  -d "$DOMAIN_WWW"

echo "Certificates issued. Restart nginx: npm run docker:prod:restart"
