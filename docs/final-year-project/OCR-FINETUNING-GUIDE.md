# OCR Fine-Tuning Guide

**Tasks 177–180 — Stage 6 AI Research & Validation**

---

## Current Baseline (Task 179 — Evaluated)

| Metric | Value | Target |
|--------|------:|-------:|
| Mean CER (Character Error Rate) | **0.663** | ≤ 0.15 |
| Exact Match Rate | **0.139** | ≥ 0.85 |
| Evaluation samples | 101 plate crops | — |

> EasyOCR pretrained (no fine-tuning) on auto-transcribed labels.

---

## Task 177 — Manually Verify 500+ Plate Transcriptions

The current OCR manifest has auto-generated transcriptions with high error rate.
You must manually correct them before fine-tuning.

```bash
# View current manifest
cat ai-service/data/datasets/manifests/ocr_manifest.csv | head -20

# Columns: image_path, split, transcription
# Review and edit the `transcription` column for accuracy
```

**Manual QC steps:**
1. Open `ai-service/data/datasets/manifests/ocr_manifest.csv` in Excel or Google Sheets
2. For each row, open the plate crop image from the `image_path` column
3. Correct the `transcription` to exactly match what is on the plate
4. Mark reviewed rows with `qc_verified=true` in a new column
5. Save as `ocr_manifest_verified.csv`

**Target**: Verify all 353 train + 101 val = **454 plate crops**

---

## Task 178 — Fine-Tune EasyOCR

After manual QC, run fine-tuning:

```bash
cd ai-service

# Step 1: Rebuild OCR dataset from verified manifest
python training/ocr/build_ocr_dataset_from_splits.py \
  --manifest data/datasets/manifests/ocr_manifest_verified.csv \
  --output-dir runs/ocr/dataset_v2

# Step 2: Prepare EasyOCR training config
python training/ocr/train.py \
  --config training/ocr/easyocr_train_config.yaml \
  --export-only
```

**EasyOCR Training Config** (`training/ocr/easyocr_train_config.yaml`):
```yaml
# EasyOCR fine-tuning config
character_list: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
train_data_dir: runs/ocr/dataset_v2/train
val_data_dir: runs/ocr/dataset_v2/val
batch_size: 32
num_epochs: 20
learning_rate: 0.0001
model_path: "CRNN"   # EasyOCR base model
save_path: models/exports/easyocr_camtraffic_v1.pth
```

**Run training (requires GPU for reasonable speed):**
```bash
python training/ocr/train.py \
  --config training/ocr/easyocr_train_config.yaml
```

---

## Task 179 — Evaluate Fine-Tuned OCR

```bash
# Re-run OCR evaluation with fine-tuned model
python training/ocr/evaluate.py \
  --manifest data/datasets/manifests/ocr_manifest_verified.csv \
  --split val \
  --model-path models/exports/easyocr_camtraffic_v1.pth \
  --output runs/ocr/evaluation/report_finetuned_val.json
```

**Expected improvement after fine-tuning:**
| Metric | Baseline | After Fine-Tune |
|--------|------:|------:|
| Mean CER | 0.663 | ≤ 0.15 |
| Exact Match | 0.139 | ≥ 0.85 |

---

## Task 180 — Edge Case Testing

Test OCR on hard scenarios:

```bash
# Test on night/rain/partial plate images
python training/ocr/evaluate.py \
  --manifest data/datasets/manifests/ocr_manifest_edge_cases.csv \
  --split test \
  --output runs/ocr/evaluation/report_edge_cases.json
```

**Edge cases to test:**
- Night shots (low light)
- Rainy/wet plates (reflection)
- Partially occluded plates
- Dirty/faded plates
- Angled plates (> 30° from camera)
- Small plates (< 100px wide in image)

---

## Confusion Patterns to Watch

Common EasyOCR misreadings for Cambodian plates:
| True | Predicted | Reason |
|------|----------|--------|
| `0` | `O` | Similar shape |
| `1` | `I` or `l` | Similar shape |
| `B` | `8` | Similar shape |
| `ព` (Khmer) | ` ` | Not in `en` model vocabulary |
| `ភ` (Khmer) | ` ` | Not in `en` model vocabulary |

> Khmer prefix characters require a custom Khmer-trained recognition model.
> For v1, only the Latin-numeral portion of the plate is read.
