# OCR Label Manifest (Task 132)

Ground-truth transcriptions for license plate crops used in EasyOCR training and evaluation.

## Manifest columns

| Column | Required | Description |
|--------|----------|-------------|
| `sample_id` | yes | Stable identifier shared with crop filename |
| `crop_path` | yes | Path to plate crop image (relative to `ai-service/`) |
| `transcription` | yes for training | Exact plate text as printed on the plate |
| `plate_type` | yes | One of `license_plate_kh_private`, `license_plate_kh_commercial`, `license_plate_kh_government` |
| `split` | yes | `train`, `val`, or `test` |
| `source_image` | recommended | Original frame used to generate the crop |
| `notes` | optional | QA comments, blur, occlusion, etc. |

## Workflow

1. Run `training/ocr/prepare_crops.py` to generate crops from YOLO plate boxes (classes 14–16).
2. Copy `manifests/ocr_manifest.template.csv` to a runtime manifest (for example `manifests/ocr_manifest.csv`).
3. Fill in `transcription` for every crop used in training.
4. Run `training/ocr/train.py` to build the EasyOCR recognition dataset layout.
5. Run `training/ocr/evaluate.py` on the `val` or `test` split before deployment.

## Rules

- Normalize transcriptions consistently (case, hyphen spacing) across the dataset.
- Do not commit raw plate media with readable PII unless your study protocol allows it.
- Keep `split` assignments stable once baseline metrics are recorded.
