# AI Training Workspace (Tasks 131-136)

Reproducible training, evaluation, optimization, export, and benchmark assets for CamTraffic AI models.

## Structure

```text
ai-service/training/
├── yolo/                         # Task 131 — traffic sign detection
│   ├── README.md
│   ├── dataset.template.yaml
│   ├── train.py
│   └── experiments/
│       └── baseline.md
├── ocr/                          # Task 132 — plate recognition
│   ├── README.md
│   ├── dataset.template.yaml
│   ├── prepare_crops.py
│   ├── train.py
│   ├── evaluate.py
│   └── experiments/
│       └── baseline.md
├── evaluation/                   # Task 133 — model evaluation
│   ├── README.md
│   └── evaluate_models.py
├── optimization/                 # Task 134 — optimization planning
│   ├── README.md
│   └── optimize_models.py
├── export/                       # Task 135 — ONNX export
│   ├── README.md
│   └── export_onnx.py
└── benchmark/                    # Task 136 — benchmark reporting
    ├── README.md
    └── generate_report.py
```

## YOLO quick start (Task 131)

```bash
cd ai-service
python training/yolo/train.py \
  --data training/yolo/dataset.template.yaml \
  --model yolo11n.pt \
  --epochs 100 \
  --imgsz 640 \
  --batch 16 \
  --project runs/yolo \
  --name baseline-v1
```

## OCR quick start (Task 132)

```bash
cd ai-service
python training/ocr/prepare_crops.py \
  --images-dir data/datasets/splits/train/images \
  --labels-dir data/datasets/splits/train/labels \
  --manifest data/datasets/manifests/ocr_manifest.csv

python training/ocr/train.py \
  --config training/ocr/dataset.template.yaml \
  --export-only

python training/ocr/evaluate.py \
  --manifest data/datasets/manifests/ocr_manifest.csv \
  --split val
```

## Phase 10 completion flow (Tasks 133-136)

```bash
cd ai-service
python training/evaluation/evaluate_models.py \
  --yolo-weights models/yolov11_traffic_signs_v1.pt \
  --yolo-data training/yolo/dataset.template.yaml \
  --ocr-manifest data/datasets/manifests/ocr_manifest.csv

python training/optimization/optimize_models.py \
  --evaluation runs/evaluation/model_eval_summary.json

python training/export/export_onnx.py \
  --weights models/yolov11_traffic_signs_v1.pt \
  --output-dir models/exports

python training/benchmark/generate_report.py \
  --evaluation runs/evaluation/model_eval_summary.json \
  --optimization runs/optimization/optimization_plan.json \
  --export runs/export/onnx_export_report.json
```

## Notes

- Update dataset paths in template YAML files before training.
- Keep experiment notes under `training/*/experiments/`.
- Generated run artifacts stay outside git (`runs/` is ignored).
