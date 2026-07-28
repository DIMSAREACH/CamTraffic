# CamTraffic AI Detection Module

**Project:** Design and Develop of an AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia  
**Status:** Production-ready (Master Build Prompt surface complete)  
**Stack:** Django 5 + DRF · React 19 · YOLOv11 · EasyOCR · OpenCV · PostgreSQL · Docker

---

## Pipeline (runtime order)

```text
Upload / Capture Frame
  → Vehicle Detection (YOLO)
  → Traffic Sign Detection (YOLO)
  → License Plate Detection
  → OCR (EasyOCR + preprocess)
  → Confidence filter
  → Violation Rule Engine
  → AIDetectionLog
  → Officer Review
  → Create Violation
  → Create Fine
```

Implementation: `src/backend/ai_detection/pipeline.py`, `pipeline_enforcement.py`, `views.py`.

**Honest gate:** OCR assists; officer confirms plate/action before fine issue.

---

## Detection sources

| Source | UI | API |
|--------|----|-----|
| Image | Enterprise AI Detection Center | `POST /api/ai/image/` (= `/api/detection/image/`, `/api/ai/detect/`) |
| Video | Video upload panel | `POST /api/ai/video/` (= `/api/detection/video/`, `/api/ai/detect-video/`) |
| Webcam | LiveWebcamPanel | `POST /api/ai/webcam/` (= `/api/detection/webcam/`) |
| Live camera | LiveCameraDetectionPanel | `POST /api/ai/live-camera/` (= `/api/ai/process-frame/`, `/api/detection/live/`) |

Live camera accepts:

- `camera_id` — registered CCTV (`frame_source_url` / `rtsp_url`)
- `stream_url` / `frame_url` / `rtsp_url` — direct RTSP, HTTP snapshot, IP camera
- multipart `image` — client-captured frame

---

## Master Build REST surface (`/api/ai/`)

| Method | Path | Handler |
|--------|------|---------|
| POST | `/api/ai/image/` | DetectSignView |
| POST | `/api/ai/video/` | DetectVideoView |
| POST | `/api/ai/webcam/` | DetectionWebcamView |
| POST | `/api/ai/live-camera/` | ProcessFrameView |
| POST | `/api/ai/process-frame/` | ProcessFrameView |
| GET | `/api/ai/history/` | DetectionLogListView |
| GET/DELETE | `/api/ai/history/{id}/` | DetectionLogDetailView |
| GET | `/api/ai/statistics/` | DetectionPageStatsView |
| GET | `/api/ai/models/` | AIModelsCatalogView |
| GET | `/api/ai/logs/` | DetectionLogListView |
| PATCH | `/api/ai/logs/{id}/review/` | DetectionLogReviewView |

Discovery: `GET /api/detection/` · Catalog: `GET /api/catalog/` → `detection.master_build`

Auth: JWT · Permissions: Police or Admin (model register via `/api/ai-models/` is Admin).

Swagger: `/api/docs/` when `ENABLE_API_DOCS=true`.

---

## Database mapping

| Master Build name | CamTraffic |
|-------------------|------------|
| AIDetectionLog | `ai_detection.AIDetectionLog` |
| DetectedVehicle | JSON `detected_vehicles` + `vehicle_count` on log |
| DetectedTrafficSign | `detected_sign`, `confidence`, … on log |
| DetectedPlate | `detected_plate`, `plate_confidence`, `plate_ocr_details` |
| DetectionHistory | Query of `AIDetectionLog` via `/history/` or `/logs/` |
| DetectionStatistics | Computed `GET /statistics/` / `/stats/` |
| ModelVersion | `ai_models.AIModelVersion` |

---

## Frontend

| Portal | Routes |
|--------|--------|
| Admin | `/admin/ai-detection`, `/admin/ai-detection/new`, `/admin/ai-logs` |
| Officer | User portal AI Detection Center (mirrored components) |

Features: image/video/webcam/live · overlays · confidence · export · history · filters · KPIs · **7-day trend + review charts** · dark/light · toasts · RTSP/HTTP URL paste.

---

## Environment

```bash
AI_USE_MOCK=False
AI_PIPELINE_DEMO_VIOLATION=False
# Optional stream gateway for RTSP
STREAM_GATEWAY_URL=...
```

Weights: `ai/weights/` · Media: `MEDIA_ROOT` detection folders.

---

## Tests

```bash
cd src/backend
python manage.py test tests.test_detection_api_aliases tests.test_uat_ai_detection_matrix -v1
```

Also: pipeline, OCR, RBAC, evidence, E2E suites under `src/backend/tests/`.

---

## Related docs

- [`COMPLETE-SYSTEM-WORKFLOW.md`](../COMPLETE-SYSTEM-WORKFLOW.md)
- [`docs/reports/AI-DETECTION-COMPLETE.md`](../reports/AI-DETECTION-COMPLETE.md)
- Postman: `docs/postman/CamTraffic-Thesis-API.postman_collection.json`
- Completion: [`AI-DETECTION-MODULE-COMPLETE.md`](../AI-DETECTION-MODULE-COMPLETE.md)
