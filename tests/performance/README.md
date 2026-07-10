# Performance Tests

> Task **119** — Performance Testing

## Overview

Lightweight latency benchmark for the backend `/health/` endpoint.

## Files

| File | Purpose |
|------|---------|
| `health-benchmark.mjs` | Measures avg/p95/max latency and enforces threshold |

## Run

```bash
# Backend must be running
npm run test:performance
```

### Environment

| Variable | Default |
|----------|---------|
| `CAMTRAFFIC_BASE_URL` | `http://localhost:8000` |
| `CAMTRAFFIC_PERF_ITERATIONS` | `30` |
| `CAMTRAFFIC_PERF_P95_MS` | `250` |

## Status

- [x] Completed
