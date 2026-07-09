# AI Accuracy Evaluation Report

**Task 153 — Final Year Project**
**Date**: 2026-07
**Model**: YOLOv11-nano (`yolov11_camtraffic_v1.pt`)
**OCR Engine**: EasyOCR (pretrained, `en` language)

---

## 1. Summary

| Component | Key Metric | Value | Target |
|-----------|-----------|------:|-------:|
| YOLO Detection | mAP@50 | **0.424** | ≥ 0.80 (production) |
| YOLO Detection | mAP@50-95 | **0.325** | — |
| YOLO Detection | Precision | **0.474** | — |
| YOLO Detection | Recall | **0.414** | — |
| License Plate | mAP@50 | **0.993** | ≥ 0.90 |
| EasyOCR | Mean CER | **0.663** | ≤ 0.15 (after fine-tune) |
| EasyOCR | Exact Match Rate | **0.139** | ≥ 0.85 (after fine-tune) |

> Bootstrap evaluation. See Section 4 for interpretation.

---

## 2. YOLO Model Evaluation

### 2.1 Training Configuration

| Parameter | Value |
|-----------|-------|
| Architecture | YOLOv11-nano |
| Pre-trained weights | `yolo11n.pt` (COCO) |
| Input size | 640 × 640 |
| Epochs | 5 (bootstrap) |
| Batch size | 16 |
| Hardware | CPU (AMD/Intel) |
| Training images | 552 |
| Validation images | 144 |
| Classes | 31 |

### 2.2 Final Training Metrics (Epoch 5)

| Metric | Value |
|--------|------:|
| Precision (P) | 0.474 |
| Recall (R) | 0.414 |
| mAP@50 | 0.424 |
| mAP@50-95 | 0.325 |

### 2.3 Per-Class Highlights

| Class | Notes |
|-------|-------|
| `plate_number` (class 14) | **mAP@50 = 0.993** — excellent; large plate dataset (453 images) |
| `plate_khmer` (class 15) | Underrepresented; requires more samples |
| `plate_foreigner` (class 16) | Underrepresented; requires more samples |
| Traffic sign classes (0–13, 17) | Low sample counts (1–46/class) — primary bottleneck |
| Vehicle classes (18–30) | Moderate; improve with dedicated vehicle footage |

### 2.4 Error Analysis Summary

_(From `ai-service/runs/evaluation/yolo_error_analysis.json`)_

- Classes with mAP@50 < 0.50: most traffic sign types (sample-limited)
- Recommended actions:
  - Collect 200+ images per traffic sign class from real Cambodian roads
  - Apply augmentation (mosaic, flip, brightness jitter)
  - Train for 100+ epochs on GPU

---

## 3. OCR Evaluation

### 3.1 Configuration

| Parameter | Value |
|-----------|-------|
| Engine | EasyOCR (pretrained) |
| Language | `en` (Latin-script plates) |
| Evaluation split | `val` |
| Samples | 101 plate crops |

### 3.2 Baseline Metrics

| Metric | Value |
|--------|------:|
| Mean CER (Character Error Rate) | 0.663 |
| Exact Match Rate | 0.139 |

### 3.3 Interpretation

- CER of 0.663 means, on average, ~66% of characters require correction.
- The baseline uses EasyOCR without any domain-specific fine-tuning.
- OCR transcriptions in the dataset were auto-generated and not manually verified, inflating CER.
- After manual QC of transcriptions and EasyOCR fine-tuning, target CER ≤ 0.15 is realistic.

---

## 4. Evaluation Interpretation

### Why are these bootstrap results?

This is a 5-epoch training run on 552 images using CPU hardware, intended to:
1. Verify the full training pipeline is functional end-to-end.
2. Establish a reproducible baseline for comparison with future runs.
3. Confirm that the license plate class (large dataset) trains well immediately.

### Expected Production Improvements

| Improvement | Expected Impact |
|-------------|----------------|
| 10,000+ labeled images (traffic signs) | mAP@50 likely ≥ 0.80 |
| 100+ epochs on GPU (A10/A100) | Precision and recall convergence |
| Manual OCR transcription QC (454 plates) | CER ≤ 0.30 |
| EasyOCR fine-tuning on QC'd data | Exact match ≥ 0.85 |

---

## 5. Optimization Plan

_(From `ai-service/runs/optimization/optimization_plan.json`)_

**Recommended Actions**:
1. Increase traffic-sign training samples for weak classes before pruning.
2. Tune YOLO hyperparameters (imgsz, epochs, augmentation).
3. Expand OCR labeled plate crops for hard weather/night scenarios.
4. Tune OCR normalization and language configuration.
5. Run ONNX export for deployment candidates (FP32, FP16, INT8).

**Deployment Targets**:
- Detection: PyTorch FP32 → ONNX FP16 → ONNX INT8 (quantized)
- OCR: EasyOCR baseline → custom recognition weights

---

## 6. Evaluation Scripts

| Script | Purpose |
|--------|---------|
| `ai-service/training/evaluation/evaluate_models.py` | Run YOLO val + OCR eval and output `model_eval_summary.json` |
| `ai-service/training/evaluation/analyze_yolo_errors.py` | Per-class error analysis and improvement recommendations |
| `ai-service/training/optimization/optimize_models.py` | Generate `optimization_plan.json` from evaluation summary |

```bash
# Re-run evaluation
python ai-service/training/evaluation/evaluate_models.py \
  --yolo-weights ai-service/models/yolov11_camtraffic_v1.pt \
  --yolo-data ai-service/training/yolo/dataset.yaml \
  --ocr-manifest ai-service/data/datasets/manifests/ocr_manifest.csv
```
