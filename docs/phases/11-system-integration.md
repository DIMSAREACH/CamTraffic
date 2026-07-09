# Phase 11 — System Integration

## Status

- [x] **Task 137** — Camera → AI Integration
- [x] **Task 138** — AI → Backend Integration
- [x] **Task 139** — Backend → Frontend Integration
- [x] **Task 140** — Real-Time Notification
- [x] **Task 141** — End-to-End Workflow
- [x] **Task 142** — Integration Validation

## Overview

Phase 11 connects all subsystems into a single end-to-end pipeline:

```
Camera Frame ──▶ AI Service ──▶ Django Backend ──▶ Frontend (SSE / REST)
                                     │
                                     ▼
                            Notification (officers, drivers)
```

## Task 137 — Camera → AI Integration

**Module**: `backend/apps/integration/ai_client.py`

- `run_pipeline(image_bytes, camera_id)` — POST to `/pipeline/run`
- `get_pipeline_status()` — GET `/pipeline/status`
- **Endpoint**: `POST /api/v1/integration/cameras/{id}/process-frame/`
  - Accepts multipart image upload
  - `?sync=1` for inline result, default = async Celery task

## Task 138 — AI → Backend Integration

**Module**: `backend/apps/integration/detection_service.py`

- Parses `AIPipelineResult` → creates `Detection` + `OCRResult`
- Resolves active `AIModelVersion` and `TrafficSign` from sign code
- **Celery task**: `integration.process_camera_frame`

## Task 139 — Backend → Frontend Integration

**Module**: `backend/apps/integration/views.py` — `DetectionLiveFeedSSEView`

- `GET /api/v1/integration/detections/live-feed/`
- Server-Sent Events stream (polls DB every 3 s)
- Query params: `camera_id`, `max_events`
- Production path: replace with Django Channels / Redis pub-sub

## Task 140 — Real-Time Notification

**Module**: `backend/apps/integration/notification_service.py`

- `notify_station_officers(detection)` — creates `Notification` rows for all active officers at the camera's station
- `notify_driver_violation(detection, driver_user)` — notifies driver when their vehicle is matched to a violation

## Task 141 — End-to-End Workflow

**Module**: `backend/apps/integration/tasks.py`

Celery task `integration.process_camera_frame` chains the full pipeline:
1. Decode base64 image
2. Call AI service
3. Ingest Detection + OCRResult
4. Auto-create Violation if plate matches registered vehicle
5. Notify officers + driver

**Violation auto-create**: `backend/apps/integration/violation_service.py`
- Looks up `Vehicle.plate_number == detected plate`
- Creates `Violation` linked to `Detection`, `Vehicle`, `Camera`, `TrafficSign`

## Task 142 — Integration Validation

**Script**: `backend/apps/integration/validate_integration.py`

Checks:
1. AI service `/health`
2. AI pipeline status (ready, mode)
3. Backend `/health`
4. Integration endpoint reachable
5. AI `/pipeline/run` mock test

Run:
```bash
python backend/apps/integration/validate_integration.py
```

Report: `backend/apps/integration/integration_validation_report.json`

## Deliverables

| File | Purpose |
|------|---------|
| `backend/apps/integration/__init__.py` | Package |
| `backend/apps/integration/ai_client.py` | AI HTTP client |
| `backend/apps/integration/detection_service.py` | Detection ingestion |
| `backend/apps/integration/notification_service.py` | Notification dispatch |
| `backend/apps/integration/violation_service.py` | Violation auto-create |
| `backend/apps/integration/tasks.py` | Celery pipeline tasks |
| `backend/apps/integration/views.py` | REST + SSE endpoints |
| `backend/apps/integration/urls.py` | URL routing |
| `backend/apps/integration/README.md` | Developer guide |
| `backend/apps/integration/validate_integration.py` | Validation script |
| `docs/phases/11-system-integration.md` | This document |
