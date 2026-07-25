# CamTraffic — Dataset Collection Layout

Phase 7 collection assets live under `ai/datasets/` (manifests tracked in Git; large media gitignored).

```
ai/datasets/
├── metadata.template.csv      # Per-image metadata schema
├── manifests/                 # JSON manifests (committed)
├── raw/                       # Incoming captures (gitignored media)
│   ├── traffic_signs/
│   ├── vehicles/              # Target: 4,615 (9 classes)
│   ├── license_plates/        # Target: 1,253 (3 classes)
│   └── road_footage/
│       ├── day/
│       ├── night/
│       ├── rain/
│       ├── highway/           # NR1, NR4, NR5, NR6
│       ├── urban/             # Phnom Penh
│       └── rural/             # Siem Reap, Battambang
├── processed/                 # Cleaned exports (gitignored)
├── splits/                    # train/val/test copies
└── annotations/               # CVAT / YOLO exports + qa/
```

## Production sign data (in repo workspace, gitignored)

| Path | Description |
|------|-------------|
| `ai/dataset/` | Full 236-class Cambodian sign YOLO set (~2,840 images) |
| `ai/dataset_10/` | 10-class production subset (123 images) |
| `ai/catalog_10_signs/` | Reference PNGs for catalog UI |

## Scripts (`ai/scripts/`)

| Script | Task |
|--------|------|
| `collection_tracker.py` | Aggregate counts vs Phase 7 targets |
| `dedup_images.py` | SHA-256 duplicate removal |
| `verify_image_quality.py` | Laplacian blur filter (threshold 80) |
| `validate_dataset.py` | YOLO pair + box validation |
| `sample_verification.py` | 10% per-class QA sample list |
| `build_prohibitory_manifest.py` | `BATCH-REF-PROH-001` manifest |
| `import_reference_vehicle_plate.py` | `BATCH-REF-VEH-PLATE-001` vehicle/plate seed import |
| `prepare_dim_sareach_datasets.py` | **One-shot prep** from `Dim Sareach/Dataset/` (signs, CAM_TSR, Roboflow, VDO) |
| `complete_reference_sign_splits.py` | 12 reference sign folders → `ai/datasets/splits/*_dim_sareach` |
| `import_cam_tsr_data.py` | `Dataset/Data` street snapshots → `cam_tsr_street_signs_dim_sareach` |
| `export_roboflow_annotations.py` | Roboflow labeled YOLO → annotations/exports |
| `import_roboflow_zip.py` | Bulk Roboflow YOLO ZIP → raw buckets |
| `dedup_images.py` | SHA-256 dedup (`--path` for raw folders) |

Legacy repo-root tools: `scripts/audit_dataset_quality.py`, `scripts/build_dataset_10.py`.

## Reference seed batch (Tasks 202–203)

| Batch | Source | Plates | Vehicles |
|-------|--------|-------:|---------:|
| `BATCH-REF-VEH-PLATE-001` | `Dim Sareach/Vichicle Detect/` (`Plate_Number`, `Vichicle&PlateNumber`, `Vichicle`) | 50 | 22 |

```bash
# Roboflow imports (default: Reference/Dim Sareach/Dataset/)
python ai/scripts/prepare_dim_sareach_datasets.py --skip-roboflow   # signs + CAM_TSR only
python ai/scripts/prepare_dim_sareach_datasets.py                # full prep including Roboflow
python ai/scripts/import_roboflow_zip.py --type vehicles --batch BATCH-ROBO-VEH-001
python ai/scripts/import_roboflow_zip.py --type plates --batch BATCH-ROBO-PLATE-001
python ai/scripts/collection_tracker.py --write-manifest
```

## Quick commands

```bash
python ai/scripts/collection_tracker.py --write-manifest
python ai/scripts/validate_dataset.py --dataset ai/dataset_10
python ai/scripts/verify_image_quality.py --dataset ai/dataset --threshold 80
python ai/scripts/sample_verification.py --dataset ai/dataset_10
python ai/scripts/build_prohibitory_manifest.py
```

## Phase 8 scripts

| Script | Task |
|--------|------|
| `build_class_maps.py` | 31-class YOLO/CVAT maps |
| `export_yolo_batch.py` | YOLO 1.1 export from raw or copy |
| `split_dataset.py` | 70/20/10 train/val/test |
| `validate_yolo_export.py` | Export QA |
| `verify_labels.py` | Class ID verification + yaml update |
| `augment_dataset.py` | Offline augmentation for small sets |
| `generate_ocr_manifest.py` | Plate OCR transcriptions |
| `annotation_tracker.py` | Annotation progress stats |
| `prepare_vehicle_cvat_pack.py` | Stage vehicle frames for CVAT |

Protocols: `protocols/cvat-annotation-workflow.md`, `protocols/annotation-guideline.md`

## Quick commands (Phase 8)

```bash
python ai/scripts/export_roboflow_annotations.py --type vehicles --batch BATCH-ROBO-VEH-001
python ai/scripts/export_roboflow_annotations.py --type plates --batch BATCH-ROBO-PLATE-001
python ai/scripts/split_dataset.py --export BATCH-ROBO-VEH-001 --output cambodia_vehicle_reference_remapped
python ai/scripts/split_dataset.py --export BATCH-ROBO-PLATE-001 --output plate_number_reference_remapped
python ai/scripts/generate_ocr_manifest.py
python ai/scripts/annotation_tracker.py --write-manifest
```
