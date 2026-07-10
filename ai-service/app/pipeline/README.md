# Detection Pipeline

> **Phase 5** · Tasks **086**

## Overview

End-to-end orchestration: preprocess → detect → OCR → store → metrics.

## Structure

```text
app/pipeline/
├── schemas.py
├── service.py
├── router.py
└── __init__.py
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/pipeline/status` | Pipeline component readiness |
| `POST` | `/pipeline/run` | Run full pipeline on uploaded image |

## Status

- [x] Multi-stage pipeline service
- [x] Optional result persistence and metrics recording
