# Logging & Monitoring

> **Phase 1** · Task **007** — Complete

## Overview

Structured logging, request tracing, and health monitoring for the Django backend.

## Components

| Module | Purpose |
|--------|---------|
| `config/logging.py` | Central `LOGGING` config (verbose / JSON, optional file rotation) |
| `config/monitoring.py` | Database and Redis health probes |
| `apps/core/middleware/request_id.py` | `X-Request-ID` propagation |
| `apps/core/middleware/request_logging.py` | HTTP access-style request logs |
| `apps/core/logging_context.py` | Request ID context for log correlation |

## Endpoints

| Endpoint | Type | Description |
|----------|------|-------------|
| `GET /health/` | Liveness | Process is running (Docker probe) |
| `GET /health/ready/` | Readiness | Postgres + Redis checks |
| `GET /api/v1/health/` | Liveness | API health |
| `GET /api/v1/health/?full=1` | Readiness | API health with dependency checks |
| `GET /api/v1/monitoring/status/` | Monitoring | Detailed status for operators |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_FORMAT` | `verbose` | `verbose` or `json` |
| `LOG_FILE` | _(empty)_ | Optional rotating log file path |
| `LOG_MAX_BYTES` | `10485760` | Max size per log file |
| `LOG_BACKUP_COUNT` | `5` | Rotated file count |
| `LOG_LEVEL` | `INFO` | Root log level |
| `DJANGO_LOG_LEVEL` | `INFO` | Django framework logs |
| `APP_LOG_LEVEL` | `DEBUG` | Application (`apps.*`) logs |
| `REQUEST_LOG_LEVEL` | `INFO` | HTTP request logs |
| `ENABLE_REQUEST_LOGGING` | `true` | Toggle request logging middleware |

Production (`config.settings.production`) defaults to JSON logs and writes to `logs/camtraffic.log`.

## Example Log Output

```text
[2026-07-06 18:30:01] INFO apps.request [request_id=8f3c2a1b-...]: GET /api/v1/users/ 200 45.23ms
```

## Commands

```bash
# Liveness
curl http://localhost:8000/health/

# Readiness (returns 503 if DB/Redis down)
curl http://localhost:8000/health/ready/

# Full monitoring status
curl http://localhost:8000/api/v1/monitoring/status/
```

## Deliverables

- [x] Centralized logging config (`config/logging.py`)
- [x] Request ID middleware
- [x] Request logging middleware
- [x] Health / readiness / monitoring endpoints
- [x] Shared TypeScript types (`@camtraffic/types`)
- [x] API client health endpoints (`@camtraffic/api`)

## Status

- [x] Task 007 complete
