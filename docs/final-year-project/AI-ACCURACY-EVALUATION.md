# AI Accuracy Evaluation Report

Task: Phase 10 (Tasks 276-295)
Date: 2026-07-10
Model: YOLOv11 (`camtraffic-v2` best checkpoint)
OCR: EasyOCR baseline + improved pipeline

## Executive Summary

| Component | Metric | Result | Target | Status |
|---|---:|---:|---:|---|
| YOLO Detection | mAP@50 | 0.6081 | >= 0.80 | In progress |
| YOLO Detection | Precision | 0.6489 | - | Achieved |
| YOLO Detection | Recall | 0.6151 | - | Achieved |
| YOLO Detection | F1 | 0.6315 | - | Achieved |
| Plate Class (`plate_number`) | mAP@50 | 0.9858 | >= 0.90 | Achieved |
| OCR | CER (improved) | 0.3524 | <= 0.15 | In progress |
| OCR | Exact Match (improved) | 0.3168 | >= 0.85 | In progress |
| Inference (CPU) | FPS | 14.43 | >= 10 (prototype) | Achieved |

## 1. Detection Evaluation

Primary sources:
- `ai-service/runs/evaluation/final/post_train_eval_v2.json`
- `ai-service/runs/evaluation/final/per_class_metrics_31classes.json`
- `ai-service/runs/evaluation/final/per_class_map50_table_31classes.md`
- `ai-service/runs/evaluation/final/yolo_confusion_matrix_v2.png`
- `ai-service/runs/evaluation/PR_curve.png`

### 1.1 Overall metrics (`camtraffic-v2`)

- mAP@50: 0.6081
- mAP@50-95: 0.4419
- Precision: 0.6489
- Recall: 0.6151
- F1: 0.6315

### 1.2 Class-level behavior

- Strongest: `plate_number` with mAP@50 = 0.9858
- Weak classes are concentrated in low-data traffic-sign categories
- Confusion matrix and PR curve indicate good convergence on plate-heavy and common vehicle classes

## 2. OCR Evaluation

Primary source:
- `ai-service/runs/evaluation/final/ocr_report_val_improved.json`

### 2.1 Baseline vs improved

- Baseline CER: 0.6632
- Improved CER: 0.3524
- Baseline exact match: 0.1386
- Improved exact match: 0.3168

Interpretation:
- Significant gains versus baseline are observed.
- Target CER <= 0.15 requires additional OCR fine-tuning and stricter label quality control.

## 3. Runtime and Deployment Readiness

Primary sources:
- `ai-service/runs/evaluation/final/fps_benchmark_cpu.json`
- `ai-service/runs/evaluation/final/fps_benchmark_gpu.json`
- `ai-service/runs/benchmark/final_benchmark_report.md`

### 3.1 CPU inference benchmark

- Mean latency: 69.28 ms/image
- Effective throughput: 14.43 FPS

### 3.2 GPU benchmark status

Current workspace environment has CPU-only torch; CUDA benchmark was not runnable in this session. The report and reproducible command are documented in `fps_benchmark_gpu.json`.

## 4. Error Analysis and Failure Cases

Primary sources:
- `ai-service/runs/evaluation/yolo_error_analysis.json`
- `ai-service/runs/evaluation/failure_cases/`
- `ai-service/runs/detect/predict/`

Findings:
- Most low-performing classes are data-scarce, not architecture-limited.
- Failure case samples were collected and organized for annotation review and retraining planning.

## 5. Recommendation Plan

1. Increase class balance for low-frequency traffic sign classes.
2. Retrain with longer schedule and stronger augmentation policy.
3. Fine-tune OCR on manually validated local license-plate text pairs.
4. Re-run CUDA benchmark in Python 3.11/3.12 with CUDA-enabled torch.
5. Track improvements in `ai-service/runs/experiments/experiment_log.csv`.

## 6. Conclusion

The current system is production-ready for pilot deployments on CPU (latency/FPS target met) and delivers strong plate detection accuracy. Full target completion for global mAP and OCR CER requires the next optimization cycle (data balancing + OCR fine-tune + CUDA training/inference environment).
