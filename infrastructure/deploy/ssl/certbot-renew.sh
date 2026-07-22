#!/usr/bin/env bash
# Renew Let's Encrypt certificates (cron / manual).
set -euo pipefail

# shellcheck source=../scripts/_compose.sh
source "$(dirname "$0")/../scripts/_compose.sh"
init_compose_env

cd "$ROOT"

compose run --rm certbot certbot renew --webroot -w /var/www/certbot
compose exec nginx nginx -s reload

echo "Certificate renewal complete."
