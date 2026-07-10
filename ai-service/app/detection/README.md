# YOLOv11 Detection

> **Phase 5** · Tasks **083**

## Overview

YOLOv11 traffic sign detection service with lazy model loading, confidence filtering, and mock mode for local development.

## Folder

`ai-service/app/detection/`

## Structure

```text
ai-service/app/detection/
├── README.md
├── __init__.py
├── constants.py      # Class label → traffic sign code mapping
├── model_loader.py   # Lazy ultralytics YOLO loader
├── router.py         # FastAPI routes
├── schemas.py        # Request/response models
└── service.py        # Inference service
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/detection/status` | Model readiness, mode, and configuration |
| `POST` | `/detection/detect` | Upload image (`multipart/form-data`) and run detection |

`/health` also includes `detection_ready` and `detection_runtime` fields.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_MODEL_PATH` | `models` | Directory containing YOLO weights |
| `AI_YOLO_WEIGHTS` | `yolov11_camtraffic_v1.pt` | Weights filename or absolute path |
| `AI_YOLO_DEVICE` | `cpu` | Ultralytics inference device |
| `AI_DETECTION_MODE` | `auto` | `auto`, `yolo`, or `mock` |
| `AI_CONFIDENCE_THRESHOLD` | `0.75` | Minimum detection confidence |

## Related Tasks

| Task | Status |
|------|--------|
| Task 083 | ✅ Completed |
| Task 086 | ⬜ Detection pipeline orchestration |
| Task 089 | ⬜ Detection history API |

## Status

- [x] YOLOv11 model loader with lazy import
- [x] Detection service and FastAPI routes
- [x] Mock mode for development without trained weights
- [x] Traffic sign code mapping for seeded catalog labels

## Notes

- Place trained weights in `ai-service/models/` (see `models/README.md`).
- `auto` mode uses YOLO when weights and `ultralytics` are available; otherwise mock detections are returned.
- Set `AI_DETECTION_MODE=yolo` to require real inference and return `503` when weights are missing.
