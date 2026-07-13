# AI Accuracy Evaluation — CamTraffic

**Date:** 2026-07-11

## Traffic sign detection (YOLO11n v2)

- mAP@50: **0.9084**
- mAP@50-95: **0.7956**
- Mean precision: **0.9598**
- Mean recall: **0.1963**
- Inference: **~20 FPS** on CPU (Intel i7, 640px)

## Multi-class detection (combined, 5 epochs)

- mAP@50: **0.4132**
- Best plate class (plate_private) mAP@50: **0.000**

## License plate OCR

- EasyOCR baseline CER: **2.5546666666666673** (50 samples)
- Post-processed CER: **2.4010000000000002**
- Exact match (improved): **0.0%**

## Artifacts

- `ai/runs/evaluation/final/` — metrics, curves, confusion matrix
- `ai/runs/benchmark/final_benchmark_report.md`
- `ai/runs/experiments/experiment_log.csv`
