#!/usr/bin/env sh
# Initial certificate issuance with Certbot (run on the host)
set -e

DOMAIN="${1:-camtraffic.kh}"
EMAIL="${2:-admin@${DOMAIN}}"

docker compose -f deploy/docker/docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  -d "admin.${DOMAIN}" \
  -d "app.${DOMAIN}" \
  -d "api.${DOMAIN}" \
  -d "ai.${DOMAIN}"

echo "Certificates issued for admin/app/api/ai.${DOMAIN}"
