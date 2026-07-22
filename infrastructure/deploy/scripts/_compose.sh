#!/usr/bin/env bash
# Shared docker compose wrapper — handles paths with spaces (Windows + Git Bash).
# shellcheck shell=bash
compose() {
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

init_compose_env() {
  # scripts live at infrastructure/deploy/scripts → repo root is ../../..
  ROOT="$(cd "$(dirname "${BASH_SOURCE[1]}")/../../.." && pwd)"
  ENV_FILE="${ENV_FILE:-$ROOT/infrastructure/deploy/env/.env.production}"
  COMPOSE_FILE="$ROOT/infrastructure/deploy/docker/docker-compose.prod.yml"
}
