#!/usr/bin/env bash
# Shared docker compose wrapper — handles paths with spaces (Windows + Git Bash).
# shellcheck shell=bash
compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

init_compose_env() {
  ROOT="$(cd "$(dirname "${BASH_SOURCE[1]}")/../.." && pwd)"
  ENV_FILE="${ENV_FILE:-$ROOT/deploy/env/.env.production}"
  COMPOSE_FILE="$ROOT/deploy/docker/docker-compose.prod.yml"
}
