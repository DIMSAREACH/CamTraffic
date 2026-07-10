# OCR Training (Task 132)

License plate recognition training assets for EasyOCR, aligned with runtime OCR in `app/ocr/`.

## Pipeline

1. **Crop plates** from YOLO annotations (`prepare_crops.py`)
2. **Annotate transcriptions** in `data/datasets/manifests/ocr_manifest.csv`
3. **Export EasyOCR dataset layout** (`train.py`)
4. **Evaluate baseline / fine-tuned models** (`evaluate.py`)

## Quick start

```bash
cd ai-service

# 1) Generate crops (after YOLO splits exist)
python training/ocr/prepare_crops.py \
  --images-dir data/datasets/splits/train/images \
  --labels-dir data/datasets/splits/train/labels \
  --manifest data/datasets/manifests/ocr_manifest.csv

# 2) Fill transcriptions in the manifest, then export dataset
python training/ocr/train.py \
  --config training/ocr/dataset.template.yaml \
  --export-only

# 3) Measure recognition quality on validation crops
python training/ocr/evaluate.py \
  --manifest data/datasets/manifests/ocr_manifest.csv \
  --split val
```

## Config

`dataset.template.yaml` points at the OCR manifest and defines split ratios, languages,
and plate class IDs (14–16).

## Output

- Crops: `data/datasets/processed/ocr/crops/` (gitignored via `processed/**`)
- Exported trainer layout: `runs/ocr/dataset/`
- Evaluation report: `runs/ocr/evaluation/report.json`

## Notes

- Copy `manifests/ocr_manifest.template.csv` before editing runtime data.
- Full GPU recognition fine-tuning uses the upstream EasyOCR trainer on the exported layout.
- Record experiment details in `experiments/baseline.md`.
