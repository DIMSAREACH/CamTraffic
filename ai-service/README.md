# CamTraffic AI Service

FastAPI microservice for traffic sign detection using YOLOv11, OpenCV, and EasyOCR.

## Structure (Phase 5 — Tasks 083–090)

```
ai-service/
├── app/
│   ├── main.py
│   ├── detection/    # Task 083 — YOLOv11
│   ├── processing/   # Task 084 — OpenCV preprocessing
│   ├── ocr/          # Task 085 — EasyOCR
│   ├── pipeline/     # Task 086 — End-to-end orchestration
│   ├── storage/      # Task 087 — Result persistence
│   ├── metrics/      # Task 088 — Performance metrics
│   ├── api/          # Task 089 — Detection history API
│   └── health/       # Task 090 — Health monitoring
├── data/             # Detection outputs + dataset workspace (Tasks 129–130)
├── training/         # Tasks 131–136 — training/eval/optimization/export
├── runs/             # Training outputs (gitignored)
├── models/           # Trained model weights
└── requirements.txt
```

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

For Docker development (lightweight deps without full ML stack):

```bash
pip install -r requirements.dev.txt
```

## Key Endpoints

| Method | Path | Task | Description |
|--------|------|------|-------------|
| `GET` | `/health` | 090 | Service and component health |
| `GET` | `/health/detailed` | 090 | Detailed health + config |
| `POST` | `/detection/detect` | 083 | YOLO sign detection |
| `POST` | `/processing/preprocess` | 084 | Image preprocessing |
| `POST` | `/ocr/plate` | 085 | License plate OCR |
| `POST` | `/pipeline/run` | 086 | Full detection pipeline |
| `GET` | `/metrics/summary` | 088 | Inference performance metrics |
| `GET` | `/api/v1/detections/history` | 089 | Stored detection history |

## Pipeline

`POST /pipeline/run` orchestrates:

1. OpenCV/Pillow preprocessing
2. YOLOv11 traffic sign detection
3. EasyOCR plate recognition on the lower image region
4. Optional JSON persistence under `data/detections/`
5. Metrics recording

Mock modes are enabled automatically when ML dependencies or weights are unavailable.

## Training (Tasks 131–136)

YOLO detection:

```bash
python training/yolo/train.py \
  --data training/yolo/dataset.template.yaml \
  --model yolo11n.pt \
  --epochs 100 \
  --imgsz 640 \
  --batch 16
```

OCR recognition (plate crops):

```bash
python training/ocr/prepare_crops.py \
  --images-dir data/datasets/splits/train/images \
  --labels-dir data/datasets/splits/train/labels \
  --manifest data/datasets/manifests/ocr_manifest.csv

python training/ocr/train.py --config training/ocr/dataset.template.yaml --export-only
python training/ocr/evaluate.py --manifest data/datasets/manifests/ocr_manifest.csv --split val
```

Model evaluation + optimization + export + benchmark:

```bash
python training/evaluation/evaluate_models.py \
  --yolo-weights models/yolov11_traffic_signs_v1.pt \
  --yolo-data training/yolo/dataset.template.yaml \
  --ocr-manifest data/datasets/manifests/ocr_manifest.csv

python training/optimization/optimize_models.py --evaluation runs/evaluation/model_eval_summary.json
python training/export/export_onnx.py --weights models/yolov11_traffic_signs_v1.pt --output-dir models/exports
python training/benchmark/generate_report.py --evaluation runs/evaluation/model_eval_summary.json --optimization runs/optimization/optimization_plan.json --export runs/export/onnx_export_report.json
```
