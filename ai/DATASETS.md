# Datasets (scaffold in git — media local only)

Training images and labels are **gitignored**. Folder layout is committed so scripts and Ultralytics paths keep working.

## Layout

```
ai/
├── dataset/                 # Full Cambodian sign YOLO set (build_dataset.py)
│   ├── data.yaml
│   ├── images/{train,val}/
│   └── labels/{train,val}/
├── dataset_10/              # Production multi-class subset
│   ├── data.yaml
│   ├── classes.txt
│   ├── images/{train,val}/
│   └── labels/{train,val}/
├── data.yaml                # Root pointer → dataset/ (updated by train/build scripts)
├── catalog_10_signs/        # UI reference PNGs (tracked)
└── datasets/                # Collection / Phase 7–8 workspace
    ├── metadata.template.csv
    ├── manifests/           # JSON stats (tracked stubs)
    ├── protocols/           # Annotation guidelines (tracked)
    ├── raw/                 # Incoming captures (media gitignored)
    │   ├── traffic_signs/
    │   ├── vehicles/
    │   ├── license_plates/
    │   └── road_footage/{day,night,rain,highway,urban,rural}/
    ├── processed/           # Cleaned exports (media gitignored)
    ├── splits/              # Named train/val/test sets (media gitignored)
    ├── annotations/         # CVAT / exports / OCR / QA
    └── labels/              # Label packs (yolo, cvat, qa)
```

## Populate

```bash
# Full sign set from Dim Sareach reference
python ai/build_dataset.py

# Collection prep (signs, Roboflow, VDO)
python ai/scripts/prepare_dim_sareach_datasets.py --skip-roboflow

# Refresh collection counts
python ai/scripts/collection_tracker.py --write-manifest

# Validate a YOLO folder
python ai/scripts/validate_dataset.py --dataset ai/dataset_10
```

See `ai/datasets/README.md` for scripts and batch IDs.
