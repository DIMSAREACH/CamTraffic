# CamTraffic AI Module

## Important: `sign_catalog.json` is not live-linked

The app **does not** read `sign_catalog.json` on every page load. Traffic sign names, descriptions, and images shown in the UI come from the **database** (`TrafficSign` table).

| File | Used for |
|------|----------|
| `sign_catalog.json` | Source metadata when you **sync** or **train** |
| `data.yaml` | YOLO training class list |
| `weights/best.pt` | Live AI detection model |
| Database | Traffic Signs page, detection labels, TTS text |

After you edit `sign_catalog.json`, run:

```bash
python scripts/sync_sign_catalog.py
```

Or from `backend`:

```bash
python manage.py sync_ai_training --skip-env --source-dir "D:/Year4/Project Thesis/Expert System/Reference(PDF Download)/Dim Sareach/Traffic Sign/01-Sign"
```

Then refresh the Traffic Signs page (Ctrl+F5).

`sync_ai_training` also runs automatically at the **end of** `python ai/train.py`.

## Quick pipeline (01-Sign + 02-Sign)

By default `build_dataset.py` merges **both** reference folders:

```bash
python ai/build_dataset.py --augments 8
python ai/train.py --epochs 30 --batch 4 --device cpu
python scripts/sync_sign_catalog.py
```

Single folder only:

```bash
python ai/build_dataset.py --source "D:/.../Traffic Sign/02-Sign" --augments 8
```

Sign names/descriptions: edit `ai/reference_sign_meta.json`, then:

```bash
python ai/build_dataset.py --augments 8
python scripts/sync_sign_catalog.py
```

`reference_sign_meta.json` does **not** store images — `sync_sign_catalog.py` copies art from `01-Sign` / `02-Sign` and removes outside backdrop automatically.

**Images are not stored in JSON.** Reference photos live in `Traffic Sign/01-Sign` and `02-Sign`. After JSON edits:

```bash
python ai/build_dataset.py --augments 8
python scripts/sync_sign_catalog.py
```

Do not hand-edit `class_key` in `sign_catalog.json` — it must match the YOLO class name from `data.yaml` or image sync will fail and the UI shows the red circle placeholder.

Sign images synced to the database have **outside sign margins** removed (white/black backdrop outside the sign shape → transparent). Colors inside the sign are kept.

## Thesis evidence (AI-06.5)

After training, export plots and sample prediction screenshots:

```bash
python scripts/export_ai06_evidence.py
```

Output: `docs/thesis_evidence/AI-06/` (`training/`, `predictions/`, `README.md`, `metrics_summary.json`).

## Detection pipeline (Option 1 — thesis defense)

Default mode is **offline** (`AI_DETECTION_MODE=local` in `backend/.env`):

```text
Webcam / Upload → OpenCV preprocess → YOLOv8 signs → catalog match
                → YOLOv8 vehicles (COCO) → EasyOCR plates → violation engine → PostgreSQL
```

Priority for signs: **YOLO** (236 trained classes from `best.pt`) → **catalog histogram match** (236 refs) → **OpenCV shape hints**.

Gemini Vision is **disabled by default**. Enable only as optional backup:

```env
AI_DETECTION_MODE=hybrid
GEMINI_ENABLED=True
GEMINI_API_KEY=your-key-here
AI_GEMINI_UPLOAD_FALLBACK=True
AI_GEMINI_LIVE_FALLBACK=True
```

Restart Django after changing `.env`. The detect API returns `detection_engine`: `yolo`, `catalog_match`, `opencv`, `shape_hint`, or `gemini` (hybrid only).

Implementation: `backend/ai_detection/services.py`, `catalog_visual_match.py`, `vehicle_detection.py`, `plate_ocr.py`.
