#!/bin/sh
set -eu

export DOMAIN_ROOT="${DOMAIN_ROOT:-camtraffic.store}"
export DOMAIN_WWW="${DOMAIN_WWW:-www.camtraffic.store}"
export DOMAIN_ADMIN="${DOMAIN_ADMIN:-admin.camtraffic.store}"
export DOMAIN_USER="${DOMAIN_USER:-app.camtraffic.store}"
export DOMAIN_API="${DOMAIN_API:-api.camtraffic.store}"

mkdir -p /etc/nginx/conf.d /var/www/certbot

if [ ! -f "/etc/letsencrypt/live/${DOMAIN_ADMIN}/fullchain.pem" ]; then
  cat > /etc/nginx/conf.d/camtraffic.conf <<EOF
upstream camtraffic_backend { server backend:8000; keepalive 32; }

server {
    listen 80;
    server_name ${DOMAIN_ADMIN};
    root /usr/share/nginx/html/admin;
    index index.html;
    client_max_body_size 32m;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location /api/ { proxy_pass http://camtraffic_backend; proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto \$scheme; }
    location /media/ { proxy_pass http://camtraffic_backend; proxy_set_header Host \$host; }
    location /health/ { proxy_pass http://camtraffic_backend; }
    location / { try_files \$uri \$uri/ /index.html; }
}

server {
    listen 80;
    server_name ${DOMAIN_USER};
    root /usr/share/nginx/html/user;
    index index.html;
    client_max_body_size 32m;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location /api/ { proxy_pass http://camtraffic_backend; proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto \$scheme; }
    location /media/ { proxy_pass http://camtraffic_backend; proxy_set_header Host \$host; }
    location / { try_files \$uri \$uri/ /index.html; }
}

server {
    listen 80;
    server_name ${DOMAIN_API};
    client_max_body_size 32m;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { proxy_pass http://camtraffic_backend; proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto \$scheme; proxy_read_timeout 120s; }
}

server {
    listen 80;
    server_name ${DOMAIN_WWW} ${DOMAIN_ROOT};
    return 301 http://${DOMAIN_ADMIN}\$request_uri;
}
EOF
else
  envsubst '${DOMAIN_ROOT} ${DOMAIN_WWW} ${DOMAIN_ADMIN} ${DOMAIN_USER} ${DOMAIN_API}' \
    < /etc/nginx/templates/camtraffic.conf.template \
    > /etc/nginx/conf.d/camtraffic.conf
fi

exec "$@"
