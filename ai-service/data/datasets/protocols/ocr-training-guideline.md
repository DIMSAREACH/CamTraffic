# OCR Training Guideline (Task 132)

## Goal

Improve license plate text recognition for Cambodian plates captured by roadside cameras,
using crop images and ground-truth transcriptions derived from the Phase 10 dataset.

## Scope

- Input: plate crops (`license_plate_kh_*` classes from YOLO annotations)
- Engine: EasyOCR recognition fine-tuning / domain adaptation
- Languages: align with runtime `AI_OCR_LANGUAGES` (default `en`; add Khmer/Latin mixes as supported)
- Output: recognition weights or lexicon tuned for deployment under `ai-service/models/`

## Data preparation

1. Export YOLO labels that include plate classes (IDs 14–16).
2. Generate crops with `training/ocr/prepare_crops.py`.
3. Transcribe each crop manually; store rows in `manifests/ocr_manifest.csv`.
4. Hold out at least 15% for validation and 10% for test.

## Transcription rules

- Copy characters exactly as printed (Latin alphanumerics and Khmer script where present).
- Preserve separators only when they appear on the plate (for example `2AB-1234`).
- Mark unreadable crops in `notes` and exclude them from training (`transcription` empty).

## Training workflow

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

`train.py` builds an EasyOCR-compatible folder layout under `runs/ocr/`. Full GPU
recognition training uses the upstream EasyOCR trainer; record hyperparameters and
checkpoints in `training/ocr/experiments/baseline.md`.

## Acceptance criteria

- Validation character error rate (CER) recorded for baseline and improved runs
- Exact-match accuracy on held-out test split documented
- Failure cases categorized (blur, glare, angle, partial occlusion, script mix)
- Trained or tuned weights referenced from deployment env (`AI_OCR_LANGUAGES`, custom weights path if added in Task 135)

## Privacy

- Minimize retention of identifiable plate text in public artifacts.
- Redact or hash plate strings in shared reports when not required for thesis evidence.
