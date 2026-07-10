# Phase 9 — AI Model Training (Tasks 246–275)

> Status: ✅ Complete — 30/30 complete
> Folder: `ai-service/training/`, `ai-service/runs/`

---

## Task 246 — YOLOv11 Installation ✅

**Objective:** Set up YOLOv11 environment with all dependencies.

**Folder:** `ai-service/`

**Technologies:** Python 3.11, ultralytics>=8.3, PyTorch

**Deliverables:**
- `ai-service/requirements.txt` with ultralytics, torch, torchvision
- `ai-service/yolo11n.pt` pretrained weights
- `ai-service/.venv/` virtual environment

**Status:** Complete — ultralytics installed, yolo11n.pt present.

---

## Task 247 — Pretrained Model Selection ✅

**Objective:** Choose the best YOLO variant for Cambodia traffic signs within resource constraints.

**Decision:** YOLOv11-nano (yolo11n.pt) — best speed/accuracy tradeoff for CPU inference.

**Rationale:** 62 ms/image on CPU; suitable for demo; GPU training will significantly improve mAP.

**Status:** Complete.

---

## Task 248 — Dataset YAML Config ✅

**Objective:** Define the dataset YAML for YOLO training.

**File:** `ai-service/training/yolo/dataset.yaml`

**Contents:**
```yaml
path: ../../data/datasets
train: splits/combined/train/images
val: splits/combined/val/images
nc: 31
names: [speed_limit_10, speed_limit_20, ...]
```

**Status:** Complete — 31 classes defined.

---

## Task 249 — Bootstrap Training ✅

**Objective:** First training run to verify the pipeline works end-to-end.

**Command:**
```bash
cd ai-service
python training/yolo/train.py --epochs 5 --device cpu
```

**Result:**
- mAP@50: **0.3506** (bootstrap baseline, CPU only)
- Duration: ~15 min on CPU
- Weights: `runs/detect/train*/weights/best.pt`

**Status:** Complete — pipeline verified.

---

## Task 250 — Training Script ✅

**Objective:** Production-ready training script with configurable args.

**File:** `ai-service/training/yolo/train.py`

**Features:** `--epochs`, `--device`, `--data`, `--model`, `--imgsz`, `--batch`

**Status:** Complete.

---

## Task 251 — Full Traffic Sign Training ⬜

**Objective:** Train YOLOv11 on the full Cambodian traffic sign + vehicle + plate dataset to reach mAP@50 ≥ 0.80.

**Folder:** `ai-service/training/`, `ai-service/runs/`

**Technologies:** YOLOv11, CUDA GPU, ultralytics

**Dependencies:** Task 231 (dataset split complete), GPU available

**Command:**
```bash
cd ai-service
python training/yolo/train.py \
  --data training/yolo/dataset.yaml \
  --model yolo11n.pt \
  --epochs 100 \
  --imgsz 640 \
  --batch 16 \
  --device 0
```

**Acceptance Criteria:**
- mAP@50 ≥ 0.80 on validation set
- All 31 classes with at least 50 val images
- Training completes without errors

**Deliverables:**
- `runs/detect/train_v2/weights/best.pt`
- `runs/detect/train_v2/results.csv`
- Training loss curves (PNG)

**Manual Testing:**
- [ ] Training starts without CUDA errors
- [ ] mAP@50 improves per epoch (no plateau too early)
- [ ] `best.pt` is smaller than 10 MB (nano model)
- [ ] Confusion matrix generated at end

---

## Task 252 — Vehicle Training ⬜

**Objective:** Fine-tune or train a dedicated vehicle detection model (9 vehicle classes).

**Command:**
```bash
python training/yolo/train.py \
  --data training/yolo/vehicles.yaml \
  --epochs 100 \
  --device 0
```

**Acceptance Criteria:** mAP@50 ≥ 0.80 on vehicle validation set

---

## Task 253 — License Plate Detection Training ⬜

**Objective:** Fine-tune YOLOv11 for high-accuracy license plate bounding box detection.

**Target:** mAP@50 ≥ 0.95 on plate dataset (current bootstrap: 0.993 — maintain this)

**Command:**
```bash
python training/yolo/train.py \
  --data training/yolo/plates.yaml \
  --epochs 50 \
  --device 0
```

---

## Task 254 — Hyperparameter Tuning ⬜

**Objective:** Find optimal hyperparameters for Cambodia traffic conditions.

**Key hyperparameters to tune:**
```yaml
lr0: 0.01        # initial learning rate
lrf: 0.01        # final learning rate factor
momentum: 0.937
weight_decay: 0.0005
warmup_epochs: 3
mosaic: 1.0      # mosaic augmentation
hsv_h: 0.015     # hue augmentation
hsv_s: 0.7       # saturation augmentation
hsv_v: 0.4       # value augmentation
```

**Tool:** Ultralytics `tune` mode or manual grid search

---

## Task 255 — Data Augmentation Tuning ⬜

**Objective:** Configure YOLO augmentation for Cambodian road conditions (rain, night, glare).

**Augmentations to enable:**
- `degrees: 10` (sign tilt)
- `translate: 0.1`
- `scale: 0.5`
- `flipud: 0.0` (signs not flipped vertically)
- `fliplr: 0.5`

---

## Task 256 — Early Stopping ⬜

**Objective:** Prevent overfitting with patience-based early stopping.

**Config:** `--patience 20` in train.py args

**Acceptance Criteria:** Training stops when mAP does not improve for 20 epochs.

---

## Task 257 — Cross Validation ⬜

**Objective:** Validate generalization with k-fold or separate hold-out test set.

**Approach:**
```bash
python training/yolo/evaluate.py \
  --weights runs/detect/train_v2/weights/best.pt \
  --data training/yolo/dataset.yaml \
  --split test
```

---

## Task 258 — Model Checkpoints ✅

**Objective:** Save best and last weights during training.

**Status:** Complete — `best.pt` + `last.pt` auto-saved by ultralytics.

---

## Task 259 — Best Model Selection ⬜

**Objective:** Compare all training runs and select the best model for production.

**Process:**
1. Collect `results.csv` from each training run
2. Compare mAP@50, mAP@50-95, inference speed
3. Select best model → copy to `models/weights/best_production.pt`

**File:** `runs/detect/*/results.csv`

---

## Task 260 — OCR Baseline Evaluation ✅

**Objective:** Establish EasyOCR baseline performance on Cambodian license plates.

**Results:**
- CER (Character Error Rate): **0.663**
- Exact Match Rate: **0.139**
- Evaluated on: 454 plate crops

**File:** `runs/ocr/evaluation/report_val.json`

**Status:** Complete — baseline documented.

---

## Task 261 — OCR Fine-Tuning ⬜

**Objective:** Fine-tune EasyOCR on verified Cambodian plate crops to improve accuracy.

**Guide:** `docs/final-year-project/OCR-FINETUNING-GUIDE.md`

**Target:**
- CER ≤ 0.15
- Exact Match ≥ 0.80

**Steps:**
1. Complete Task 262 (plate QC) first
2. Follow fine-tuning guide
3. Train custom EasyOCR model
4. Re-evaluate on test set

---

## Task 262 — Verify OCR Transcriptions ⬜

**Objective:** Manually verify all 454 plate transcriptions for accuracy.

**File:** `ai-service/data/datasets/annotations/ocr_manifest.csv`

**Process:**
1. Open `ocr_manifest.csv`
2. View each plate crop image
3. Verify the `plate_text` column matches the actual plate
4. Correct any mistakes

**Acceptance Criteria:**
- All 454 entries reviewed
- Transcription accuracy ≥ 95%

**Manual Testing:**
- [ ] Every row has a non-empty `plate_text`
- [ ] Plate text matches visible characters in image
- [ ] Standard format: e.g., `2BQ-2973`, `BTM2A-9079`

---

## Task 263 — PaddleOCR Comparison ⬜

**Objective:** Compare PaddleOCR vs EasyOCR on Cambodian plate test set.

**Command:**
```bash
pip install paddlepaddle paddleocr
python training/ocr/benchmark_paddleocr.py
```

**Output:** comparison table in `runs/ocr/comparison/`

---

## Task 264 — ONNX Export ✅

**Objective:** Export best YOLOv11 weights to ONNX for deployment.

**File:** `models/exports/yolov11_camtraffic_v1.onnx` (10.1 MB, opset 12)

**Command:**
```bash
from ultralytics import YOLO
model = YOLO('runs/detect/train*/weights/best.pt')
model.export(format='onnx', opset=12, simplify=True)
```

**Status:** Complete — ONNX model available.

---

## Task 265 — TensorRT Optimization ⬜

**Objective:** Optional — export to TensorRT for maximum GPU inference speed.

**When:** Only if GPU server has TensorRT installed.

**Command:**
```bash
model.export(format='engine', device=0, half=True)
```

---

## Task 266 — AI API Integration ✅

**Objective:** Integrate trained YOLO + OCR into the FastAPI detection pipeline.

**Folder:** `ai-service/app/`

**Status:** Complete — pipeline: detect → OCR → store → metrics.

---

## Task 267 — Mock Mode ✅

**Objective:** Allow development without GPU by returning synthetic detection results.

**Config:** `AI_MOCK_MODE=true` in `.env`

**Status:** Complete — mock responses in `app/detection/mock.py`.

---

## Task 268 — Inference Script ✅

**Objective:** Production inference pipeline in `ai-service/app/`.

**Status:** Complete — `app/detection/`, `app/pipeline/`, `app/ocr/`.

---

## Task 269 — Training v2 ⬜

**Objective:** Retrain after OCR QC (Task 262) and additional dataset collection.

**Process:** Collect more images for underperforming classes → re-annotate → retrain.

---

## Task 270 — Model Comparison ⬜

**Objective:** Compare YOLOv11 performance against YOLOv8 for thesis.

**Output:** Table in Chapter 6 — Testing & Evaluation.

---

## Task 271 — Edge Case Testing ⬜

**Objective:** Test AI detection on difficult conditions.

**Cases:**
- Night images (low light)
- Rain/wet road
- Partial sign occlusion
- Motion blur from moving vehicle

---

## Task 272 — Plate OCR Edge Cases ⬜

**Objective:** Test OCR on difficult plate conditions.

**Cases:**
- Damaged plates
- Dirty/obscured plates
- Angled plates
- Faded characters

---

## Task 273 — Training Documentation ✅

**Objective:** Document OCR fine-tuning process for thesis and reproducibility.

**File:** `docs/final-year-project/OCR-FINETUNING-GUIDE.md`

**Status:** Complete.

---

## Task 274 — Production Weights ⬜

**Objective:** Deploy GPU-trained model weights to the production AI service.

**Process:**
1. Copy `best.pt` to `ai-service/models/weights/best_production.pt`
2. Update `AI_MODEL_PATH` in production `.env`
3. Restart AI service

---

## Task 275 — Final Training Report ⬜

**Objective:** Document complete training results for thesis Chapter 6.

**Contents:**
- Dataset statistics per split
- Training configuration
- Per-epoch mAP curve (PNG)
- Best model: mAP@50, mAP@50-95, Precision, Recall, F1
- OCR: CER, Exact Match
- Inference speed (CPU + GPU)

**File:** `runs/training/final_training_report.md`
