# AI Health Monitoring

> **Phase 5** · Tasks **090**

## Overview

Service health checks and component status aggregation.

## Structure

```text
app/health/
├── schemas.py
├── service.py
├── router.py
└── __init__.py
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Overall and per-component health |
| `GET` | `/health/detailed` | Health plus config and storage stats |

## Status

- [x] Component health for processing, detection, OCR, storage, pipeline
- [x] Aggregated status: ok / degraded / unavailable
