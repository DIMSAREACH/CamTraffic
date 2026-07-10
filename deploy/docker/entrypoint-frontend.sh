#!/bin/sh
set -e

cd /app

# Named volumes replace image node_modules on first start; install when missing.
if [ ! -e node_modules/react-router-dom ]; then
  echo "Installing frontend workspace dependencies..."
  npm ci
fi

cd "/app/${APP_DIR}"
exec npm run dev -- --host 0.0.0.0
