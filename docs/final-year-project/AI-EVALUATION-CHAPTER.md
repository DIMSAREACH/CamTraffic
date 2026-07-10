# Chapter 6 - AI Testing and Evaluation (Stage 9)

## 6.1 Evaluation Setup

The CamTraffic AI evaluation was performed on the trained YOLOv11 v2 detector and the EasyOCR pipeline with improved plate normalization. Evaluation artifacts were consolidated under `ai-service/runs/evaluation/final/`.

Detection model:
- YOLOv11 v2 weights: `runs/detect/camtraffic-v2/weights/best.pt`
- Validation split: `training/yolo/dataset.yaml` val set

OCR model:
- Baseline report: `runs/ocr/evaluation/report_val.json`
- Improved report: `runs/ocr/evaluation/report_val_improved.json`

## 6.2 YOLO Detection Accuracy

From `post_train_eval_v2.json`:

- mAP@50: 0.6081
- mAP@50-95: 0.4419
- Precision: 0.6489
- Recall: 0.6151

The overall F1 score is computed from precision and recall:

$$
F1 = \frac{2PR}{P+R} = \frac{2 \times 0.6489 \times 0.6151}{0.6489 + 0.6151} = 0.6315
$$

Interpretation:
- The model is suitable for end-to-end pipeline validation and real-time prototype deployment.
- The current run is still below the production target of mAP@50 >= 0.80.
- Primary reason: CPU-only training regime and limited long-epoch optimization.

## 6.3 Per-Class Results

Per-class AP@50 for all 31 classes is recorded in:
- `ai-service/runs/evaluation/final/per_class_map50_table_31classes.md`

The highest AP@50 classes include `speed_limit_20` and `speed_limit_40`, while multiple long-tail classes remain weak and require additional class-balanced sampling and augmentation.

## 6.4 Confusion Matrix and Error Analysis

Confusion matrix outputs:
- `ai-service/runs/evaluation/final/yolo_confusion_matrix_v2.png`
- `ai-service/runs/evaluation/final/yolo_confusion_matrix_v2_normalized.png`

The confusion matrix indicates that strong classes are detected reliably, but low-frequency classes exhibit overlap and missed detections. This is consistent with class imbalance in the collected dataset.

## 6.5 Inference Performance

CPU benchmark (`fps_benchmark_cpu.json`):
- Mean latency: 69.28 ms/image
- P95 latency: 95.21 ms
- FPS: 14.43

This satisfies the prototype performance target (< 200 ms/image on CPU).

GPU benchmark:
- Hardware is available (RTX 4060), but CUDA inference benchmark was unavailable in the current Python environment because PyTorch is CPU-only.
- Status and remediation are documented in `fps_benchmark_gpu.json`.

## 6.6 OCR Evaluation

Improved OCR post-processing results (`ocr_report_val_improved.json`):
- CER: 0.6632 -> 0.3524
- Exact Match Rate: 0.1386 -> 0.3168

This confirms that the normalization and plate-substring extraction logic significantly improves practical recognition quality without retraining model weights.

## 6.7 Baseline Comparison

From `model_comparison_report.json`:
- YOLOv11 v1 mAP@50: 0.4240
- YOLOv11 v2 mAP@50: 0.6081
- Improvement: +0.1841 (+18.41 percentage points)

YOLOv8/YOLOv5 baseline artifacts were not available in this repository snapshot; therefore, comparison was performed against the available internal baseline (v1).

## 6.8 Summary

Stage 9 evaluation confirms measurable progress in both detection and OCR quality. The current system meets CPU real-time constraints for prototype use and demonstrates substantial quality gains over the initial baseline. The key next step for production readiness is GPU-enabled retraining for 100+ epochs to close the remaining mAP gap to the target threshold.