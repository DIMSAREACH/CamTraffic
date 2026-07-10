# AI Performance Metrics

> **Phase 5** · Tasks **088**

## Overview

In-memory inference speed and request counters for the AI pipeline.

## Structure

```text
app/metrics/
├── schemas.py
├── collector.py
├── service.py
├── router.py
└── __init__.py
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/metrics/summary` | Average stage timings and counts |
| `POST` | `/metrics/reset` | Reset counters |

## Status

- [x] Thread-safe metrics collector
- [x] Per-stage timing averages
