# OCR Dataset Creation (Task 141)

## Objective

Create the OCR training/evaluation dataset by extracting license-plate crops from
YOLO plate boxes and producing a runtime `ocr_manifest.csv`.

## Inputs

- YOLO split folders (already created in Task 140):
  - `data/datasets/splits/train/images`
  - `data/datasets/splits/train/labels`
  - `data/datasets/splits/val/images`
  - `data/datasets/splits/val/labels`
  - `data/datasets/splits/test/images`
  - `data/datasets/splits/test/labels`

## Output artifacts

- Crops:
  - `data/datasets/processed/ocr/crops/*.png`
- Runtime manifest:
  - `data/datasets/manifests/ocr_manifest.csv`

## Workflow

1. Extract plate crops + initialize manifest (transcriptions are empty initially):

```bash
cd ai-service
python training/ocr/build_ocr_dataset_from_splits.py \
  --splits-base data/datasets/splits \
  --output-manifest data/datasets/manifests/ocr_manifest.csv \
  --output-crops-dir data/datasets/processed/ocr/crops \
  --splits train,val,test \
  --reset-manifest
```

2. Manually type ground-truth `transcription` values in `ocr_manifest.csv`.
   - Use OCR transcription rules from `protocols/ocr-training-guideline.md`.

3. Validate manifest structure and crop references:

```bash
python data/datasets/scripts/validate_ocr_manifest.py \
  --manifest data/datasets/manifests/ocr_manifest.csv \
  --validate-crops-exist
```

4. When enough rows have `transcription`, export the EasyOCR dataset:

```bash
python training/ocr/train.py \
  --config training/ocr/dataset.template.yaml \
  --export-only
```

## Completion criteria

Task 141 is complete when:

- Plate crops are generated and stored under `processed/ocr/crops/`
- `ocr_manifest.csv` exists with correct schema
- Transcriptions are filled for all training/validation rows (manual step)
