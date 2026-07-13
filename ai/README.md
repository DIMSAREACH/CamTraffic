# CamTraffic AI Module

Computer vision assets and Python dependencies for traffic sign detection and license plate OCR.

## Layout

| Path | Purpose |
|------|---------|
| `weights/best.pt` | Production YOLO weights (gitignored — train locally) |
| `dataset_10/` | 10-class Cambodian sign dataset (YOLO format) |
| `dataset/` | Full 236-class sign dataset (gitignored, local only) |
| `datasets/` | Collection manifests, raw/processed layout (Phase 7) |
| `scripts/` | dedup, quality check, validation, collection tracker |
| `runs/` | Training and evaluation outputs |

## Inference (runtime)

Detection runs in **Django** (`backend/ai_detection/`), not a separate FastAPI process:

- `POST /api/ai/detect/` — upload or frame processing
- Mock mode: `AI_MOCK_MODE=true` in `backend/.env`

## Setup (training / local inference)

```bash
cd ai
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

Train with project scripts:

```bash
python scripts/build_dataset_10.py
python ai/scripts/collection_tracker.py --write-manifest
python ai/scripts/build_class_maps.py
python ai/scripts/annotation_tracker.py --write-manifest
```

## Requirements

See `requirements.txt` for Ultralytics YOLO, OpenCV, EasyOCR, and supporting libraries.

## Related docs

- `docs/ARCHITECTURE.md` §7 — AI pipeline
- Phase 7–10 checklist tasks in `docs/CHECKLIST.md`
