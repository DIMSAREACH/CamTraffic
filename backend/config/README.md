# Django Configuration

> **Tasks 004, 006, 007** — Project init, environment, logging & monitoring

## Settings Modules

| File | Purpose |
|------|---------|
| `settings/base.py` | Shared config — apps, DB, DRF, CORS, Celery, logging |
| `settings/development.py` | Debug mode, browsable API |
| `settings/production.py` | Security hardening, JSON logs, file rotation |

## Config Modules

| File | Purpose |
|------|---------|
| `env.py` | Environment loader and host/port resolution |
| `logging.py` | Centralized `LOGGING` configuration (Task 007) |
| `monitoring.py` | Health and readiness probes (Task 007) |

## URL Configuration

| File | Routes |
|------|--------|
| `urls.py` | `/admin/`, `/health/`, `/health/ready/`, `/api/v1/` |
| `api_urls.py` | All `/api/v1/*` app routes |

## Environment

Loaded from monorepo root `.env` via `python-dotenv`.

Key variables: `POSTGRES_*`, `REDIS_URL`, `DJANGO_SECRET_KEY`, `LOG_FORMAT`, `ENABLE_REQUEST_LOGGING`

See [logging docs](../docs/logging/README.md) for monitoring endpoints and log configuration.

## Status

- [x] Modular settings
- [x] 20 Django apps registered
- [x] Custom User model
- [x] API v1 routing
- [x] Initial migrations
- [x] Logging & monitoring (Task 007)
