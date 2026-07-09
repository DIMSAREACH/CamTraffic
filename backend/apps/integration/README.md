# System Integration (Phase 11)

This package wires the Camera, AI Service, Backend, and Notification subsystems into
a single end-to-end pipeline.

## Architecture

```
Camera frame (image bytes)
  │
  ▼
POST /api/v1/integration/cameras/{id}/process-frame/
  │  (sync: inline, async: Celery task)
  ▼
AI Service  POST /pipeline/run
  │  (YOLOv11 detection + EasyOCR plate recognition)
  ▼
Detection ingestion (detection_service.py)
  │  creates Detection + OCRResult rows
  ▼
Violation auto-create (violation_service.py)
  │  matches plate → Vehicle → creates Violation
  ▼
Notification dispatch (notification_service.py)
  │  creates Notification rows for station officers + driver
  ▼
SSE live feed  GET /api/v1/integration/detections/live-feed/
  (frontend polls via Server-Sent Events)
```

## Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/v1/integration/cameras/{id}/process-frame/` | Submit a camera frame for AI processing |
| `GET`  | `/api/v1/integration/ai-status/` | Proxy AI service pipeline status |
| `GET`  | `/api/v1/integration/detections/live-feed/` | SSE stream of new detections |

### Process-Frame

```bash
# Async (returns task_id)
curl -X POST http://localhost:8000/api/v1/integration/cameras/1/process-frame/ \
  -H "Authorization: Bearer <token>" \
  -F "image=@frame.jpg"

# Sync (returns result inline)
curl -X POST "http://localhost:8000/api/v1/integration/cameras/1/process-frame/?sync=1" \
  -H "Authorization: Bearer <token>" \
  -F "image=@frame.jpg"
```

### Live Feed (SSE)

```javascript
const es = new EventSource(
  '/api/v1/integration/detections/live-feed/?camera_id=1',
  { withCredentials: true }
);
es.onmessage = (e) => {
  const detection = JSON.parse(e.data);
  console.log('New detection:', detection);
};
```

## Modules

| Module | Task |
|--------|------|
| `ai_client.py` | 137 — HTTP client for AI service |
| `detection_service.py` | 138 — Persist AI results as Django models |
| `notification_service.py` | 140 — Create Notification rows |
| `violation_service.py` | 141 — Auto-create Violation from plate match |
| `tasks.py` | 138 / 141 — Celery tasks |
| `views.py` | 137 / 139 — API endpoints + SSE stream |
| `validate_integration.py` | 142 — Smoke-test validation script |

## Validation

```bash
cd d:/Year4/Project\ Thesis/Expert\ System/Project/CamTraffic
python backend/apps/integration/validate_integration.py
```

Requires both the AI service (`uvicorn`) and backend (`django runserver`) to be running.
