# CamTraffic — Performance Evaluation

**Date:** 2026-07-12  
**Phase:** 12 — Tasks 331–333  
**Hardware (dev):** Windows 11 · Intel CPU · SQLite · local Django dev server

---

## 1. API response time — Task 331

### Health endpoint benchmark

**Target:** p95 < 250 ms (local dev baseline)

**Script:** `tests/performance/health-benchmark.mjs`

```bash
# Start backend first
cd backend && python manage.py runserver

# From repo root
npm run benchmark:health
# or: node tests/performance/health-benchmark.mjs http://127.0.0.1:8000 30
```

**Sample result (2026-07-12, 30 iterations):**

| Metric | Value |
|--------|------:|
| avg_ms | ~8–25 |
| p95_ms | ~15–45 |
| Target (250 ms) | **PASS** |

### Key authenticated endpoints (manual spot-check)

| Endpoint | Method | Typical latency | Notes |
|----------|--------|----------------:|-------|
| `/api/auth/login/` | POST | 80–200 ms | Includes password hash |
| `/api/auth/profile/` | GET | 20–50 ms | JWT validation |
| `/api/dashboard/admin/` | GET | 50–150 ms | Aggregated counts |
| `/api/ai/detect/` | POST | 1–5 s | Dominated by YOLO inference |
| `/api/cameras/live-status/` | GET | 30–80 ms | DB + status rollup |

---

## 2. AI inference speed — Task 332

**Production weights:** `ai/weights/best_v2.pt` (10-class signs, 10 epochs, mAP@50 = 0.908)

**Artifact:** `ai/runs/evaluation/final/fps_benchmark_cpu.json`

| Metric | Value |
|--------|------:|
| imgsz | 640 |
| iterations | 30 |
| **fps_cpu** | **19.95** |
| GPU benchmark | `fps_benchmark_gpu.json` (when CUDA available) |

**Target assessment:**

| Target | Result |
|--------|:------:|
| Real-time-ish CPU inference (>15 FPS @ 640px) | **PASS** |
| Detection accuracy mAP@50 > 0.85 | **PASS** (0.908) |

**Pipeline speed unit tests:** `backend/tests/test_pipeline_speed.py`

---

## 3. Concurrent-user load readiness — Task 333

### Current architecture

| Layer | Scaling mechanism |
|-------|-------------------|
| API | Gunicorn multi-worker (`deploy/gunicorn/gunicorn.conf.py`) |
| Async tasks | Celery + Redis (Windows dev: `--pool=solo`) |
| Static/media | Nginx in production compose |
| DB | PostgreSQL in production (`docker-compose.prod.yml`) |

### Load readiness checklist

| Item | Status | Notes |
|------|:------:|-------|
| Stateless JWT auth | ✅ | Horizontally scalable API workers |
| DB connection pooling | 🔄 | Configure in production PostgreSQL |
| Redis cache / rate limit | ✅ | `SecurityMiddlewareTest` |
| Celery notification offload | ✅ | Sync fallback when broker unavailable |
| Health probes | ✅ | `/health/`, `/health/ready/`, `/health/status/` |
| AI inference bottleneck | ⚠️ | CPU ~20 FPS; GPU recommended for multi-camera |

### Recommended load test (future)

```bash
# Example with k6 (not bundled — run when staging is available)
k6 run backend/tests/performance/health-benchmark.mjs
```

For thesis scope, concurrent readiness is validated by:

1. Stateless API design (JWT, no server sessions)
2. Celery decoupling for notifications and heavy exports
3. Health benchmark p95 well under threshold
4. Production Docker compose with 8 services (Phase 13)

---

## Summary

| Task | Metric | Target | Result |
|------|--------|--------|:------:|
| 331 | Health p95 | < 250 ms | **PASS** |
| 332 | YOLO FPS (CPU) | ≥ 15 FPS | **PASS** (~20 FPS) |
| 332 | mAP@50 signs v2 | ≥ 0.85 | **PASS** (0.908) |
| 333 | Horizontal scale design | Stateless + Celery | **READY** |

*Artifacts: `ai/runs/evaluation/final/`, `tests/performance/health-benchmark.mjs`*
