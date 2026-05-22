# CamTraffic AI Module

YOLOv8-based **Cambodia traffic sign** detection trained from your thesis reference folder.

## Source data

Official sign images from:

`Reference(PDF Download)/Dim Sareach/ស្លាកសញ្ញាចរាចរណ៏/`

- **232 sign classes** (R1-xx, W1-xx, G4-xx, P1-xx, S1-xx, …)
- PDF: `ស្លាកសញ្ញាចរាចរណ៏.pdf` (reference document)

## Quick pipeline (full train)

```bash
cd ai
..\backend\venv\Scripts\python.exe build_dataset.py --augments 8
..\backend\venv\Scripts\python.exe train.py --epochs 30 --batch 8 --device cpu
```

With NVIDIA GPU (faster):

```bash
python train.py --epochs 50 --batch 16 --device 0
```

Import signs into Django + copy images:

```bash
cd ..\backend
python manage.py import_cambodia_signs --update
```

## Enable live detection in the app

After `ai/weights/best.pt` exists, set in `backend/.env`:

```env
AI_USE_MOCK=False
AI_MODEL_PATH=../ai/weights/best.pt
AI_CONFIDENCE_THRESHOLD=0.35
```

Restart Django: `python manage.py runserver`

## Test one image

```bash
cd backend
python manage.py test_sign_detect "..\ai\test_samples\R1-01-no-left-turn-reference.png"
```

## Files

| File | Purpose |
|------|---------|
| `build_dataset.py` | Build YOLO dataset from reference PNGs |
| `train.py` | Train YOLOv8 → `weights/best.pt` |
| `data.yaml` | Auto-generated class list |
| `sign_catalog.json` | Sign codes for DB import |
| `dataset/` | Train/val images + labels |

## Khmer voice (no Windows Khmer voice needed)

Windows often has **no Khmer** under Settings → Speech. CamTraffic uses **server TTS** instead:

```bash
cd backend
venv\Scripts\pip install edge-tts
# .env: TTS_ENABLED=True
python manage.py runserver
```

The app calls `POST /api/ai/tts/` and plays MP3 (Microsoft **km-KH-SreymomNeural** / **km-KH-PisethNeural**). Requires **internet** on the machine running Django.

## Notes

- Training **232 classes** on CPU can take **several hours**. Use GPU if available.
- For better real-road accuracy, add photos taken on streets and label with [LabelImg](https://github.com/HumanSignal/labelImg), then re-run `build_dataset.py` and `train.py`.
- Until `AI_USE_MOCK=False`, the API still works in demo mode but uses the full **232-sign catalog** in the database.
