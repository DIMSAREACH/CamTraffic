# Model Evaluation (Task 133)

Evaluation utilities for Phase 10 model quality checks.

## Scope

- YOLO detection validation metrics (`mAP50`, `mAP50-95`, precision, recall)
- OCR recognition metrics (mean CER, exact-match rate)
- Unified AI evaluation summary JSON

## Quick start

```bash
cd ai-service
python training/evaluation/evaluate_models.py \
  --yolo-weights models/yolov11_traffic_signs_v1.pt \
  --yolo-data training/yolo/dataset.template.yaml \
  --ocr-manifest data/datasets/manifests/ocr_manifest.csv \
  --ocr-split val \
  --output runs/evaluation/model_eval_summary.json
```

## Output

- `runs/evaluation/model_eval_summary.json`
