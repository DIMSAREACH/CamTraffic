# Dataset Validation Checklist (Task 139)

## Objective

Validate annotated dataset quality before train/val/test splitting and model training.

## Validation scope

- Missing labels (image without label, label without image)
- Wrong labels (malformed YOLO rows)
- Incorrect bounding boxes (out-of-range or invalid normalized coordinates)
- Duplicate images (content hash duplicates)
- Corrupted images (unreadable files)
- Empty images/labels (zero-byte media or empty label files)
- Incorrect classes (class IDs outside taxonomy)

## Workflow

1. Point validator at exported dataset folders (`images/` + `labels/`).
2. Run validation script and review JSON report.
3. Fix or reject flagged samples.
4. Re-run until report status is `passed`.

```bash
cd ai-service
python data/datasets/scripts/validate_dataset.py \
  --images-dir data/datasets/annotations/exports/BATCH-ANN-001/images \
  --labels-dir data/datasets/annotations/exports/BATCH-ANN-001/labels \
  --report data/datasets/manifests/dataset_validation_report.json
```

## Pass criteria

- `missing_labels = 0`
- `wrong_labels = 0`
- `incorrect_boxes = 0`
- `duplicate_images = 0` (or documented and removed)
- `corrupted_images = 0`
- `empty_images = 0`
- `empty_labels = 0`
- `incorrect_classes = 0`

## Output

- Machine-readable report: `manifests/dataset_validation_report.json`
- Human checklist reference: this document + `labels/qa/annotation_qa_checklist.md`
