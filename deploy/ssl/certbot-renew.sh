#!/usr/bin/env sh
# Renew Let's Encrypt certificates and reload Nginx (Task 127)
set -e

DOMAIN="${CAMTRAFFIC_DOMAIN:-camtraffic.kh}"
EMAIL="${CAMTRAFFIC_SSL_EMAIL:-admin@${DOMAIN}}"
CERT_PATH="${CAMTRAFFIC_SSL_CERT_PATH:-/etc/letsencrypt/live/${DOMAIN}}"

certbot renew \
  --webroot -w /var/www/certbot \
  --quiet \
  --deploy-hook "nginx -s reload"

echo "Certificates renewed from ${CERT_PATH}"
