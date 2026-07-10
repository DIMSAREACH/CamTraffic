# CI/CD Pipeline

> Task **125** — GitHub Actions

## Workflow

Canonical file: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

Reference copy: [`github-actions-ci.yml`](./github-actions-ci.yml)

## Pipeline stages

1. **validate-and-test** — build packages, `validate:all`, pytest, vitest, typecheck
2. **docker-build** — build `Dockerfile.backend.prod` and `Dockerfile.nginx.prod`

## Triggers

- Push to `main`, `master`, `develop`
- Pull requests targeting those branches

## Status

- [x] Completed
