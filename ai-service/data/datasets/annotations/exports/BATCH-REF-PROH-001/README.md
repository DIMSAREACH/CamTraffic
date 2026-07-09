# Prohibitory Reference Catalog Batch

> Source: `Road signs in Cambodia / 1-Prohibitory signs` (46 PNG reference graphics)

This batch contains **reference sign graphics** extracted from the Cambodian road sign catalog,
not roadside photographs. Use it to:

- Bootstrap YOLO class labels for prohibitory signs
- Validate the dataset pipeline before CVAT annotation
- Supplement (not replace) real-world captures from `raw/traffic-signs/`

## Layout

```text
BATCH-REF-PROH-001/
├── images/     # 46 renamed PNG files
├── labels/     # Auto-generated YOLO boxes (sign region on black background)
└── README.md
```

## Import command

```bash
cd ai-service
python data/datasets/scripts/import_prohibitory_reference.py
```

## Validate

```bash
python data/datasets/scripts/validate_dataset.py \
  --images-dir data/datasets/annotations/exports/BATCH-REF-PROH-001/images \
  --labels-dir data/datasets/annotations/exports/BATCH-REF-PROH-001/labels
```

## Mapped classes

| YOLO class | Count |
|------------|------:|
| `no_entry` | 3 |
| `no_u_turn` | 1 |
| `parking_prohibited` | 6 |
| `speed_limit_20` | 1 |
| `speed_limit_50` | 1 |
| `stop` | 3 |
| `unknown_sign` | 31 |

See `manifests/prohibitory_sign_class_map.csv` for per-file mapping.

## Next steps

1. Collect **roadside photos** per `protocols/traffic-sign-collection-checklist.md`
2. Annotate real photos in CVAT (`protocols/cvat-annotation-workflow.md`)
3. Merge validated exports into `splits/` for training (Task 140)
