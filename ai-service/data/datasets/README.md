# Dataset Collection Workspace (Tasks 129–131)

This folder is the canonical workspace for AI dataset collection and annotation
in Phase 10.

## Structure

```text
ai-service/data/datasets/
├── raw/                      # Raw captured images/videos (ignored by git)
│   ├── traffic-signs/
│   ├── vehicles/
│   ├── license-plates/
│   ├── videos/
│   └── dashcam/
├── processed/                # Preprocessed frames/crops (ignored by git)
├── splits/                   # train/val/test split outputs (ignored by git)
├── annotations/              # Annotation exports/review artifacts
│   ├── README.md
│   └── exports/
├── metadata/                 # Collection metadata and QA logs
├── manifests/
│   ├── sources.template.json
│   ├── collection_log.template.csv
│   ├── dataset_manifest.template.csv
│   ├── ocr_manifest.template.csv
│   ├── traffic_sign_target_tracker.template.csv
│   ├── anpr_vehicle_target_tracker.template.csv
│   ├── vehicle_metadata.template.csv
│   ├── dashcam_session_log.template.csv
│   ├── dashcam_hours_tracker.template.csv
│   ├── dataset_organization_log.template.csv
│   ├── metadata.template.csv
│   ├── annotation_batch_log.template.csv
│   └── dataset_validation_report.template.json
├── scripts/
│   ├── organize_dataset.py
│   ├── validate_metadata.py
│   ├── validate_yolo_export.py
│   └── validate_dataset.py
├── labels/
│   ├── README.md
│   ├── yolo/
│   │   ├── classes.txt
│   │   ├── class-map.json
│   │   └── examples/
│   ├── ocr/
│   │   └── README.md
│   └── qa/
│       └── annotation_qa_checklist.md
└── protocols/
    ├── ai-objectives-roadmap.md
    ├── traffic-sign-research-cambodia.md
    ├── equipment-preparation-checklist.md
    ├── folder-structure-spec.md
    ├── location-collection-plan.md
    ├── traffic-sign-collection-checklist.md
    ├── anpr-vehicle-collection-checklist.md
    ├── dashcam-recording-checklist.md
    ├── dataset-organization-checklist.md
    ├── metadata-collection-guideline.md
    ├── cvat-annotation-workflow.md
    ├── dataset-validation-checklist.md
    ├── collection-protocol.md
    ├── class-taxonomy.md
    ├── annotation-guideline.md
    └── ocr-training-guideline.md
```

## Rules

- Do not commit real dataset media to git.
- Keep personally identifiable information minimized and documented.
- Every collection batch must update:
  - `manifests/sources.template.json` (or your copied runtime file)
  - `manifests/collection_log.template.csv`

## Minimum collection metadata

For each sample: source, location, timestamp, weather, camera angle, sign class,
and quality score.

## Annotation assets

Task 130 adds:

- annotation guideline (`protocols/annotation-guideline.md`)
- YOLO class definitions (`labels/yolo/classes.txt`)
- class ID mapping (`labels/yolo/class-map.json`)
- QA checklist (`labels/qa/annotation_qa_checklist.md`)

Task 132 adds:

- OCR manifest template (`manifests/ocr_manifest.template.csv`)
- OCR label README (`labels/ocr/README.md`)
- OCR training protocol (`protocols/ocr-training-guideline.md`)

Task 131 (detailed collection workflow) adds:

- dataset folder structure spec (`protocols/folder-structure-spec.md`)
- raw acquisition subfolders (`raw/traffic-signs`, `raw/vehicles`, `raw/license-plates`, `raw/videos`, `raw/dashcam`)
- annotation workspace (`annotations/`)
- metadata workspace (`metadata/`)

Task 132 adds:

- location planning protocol (`protocols/location-collection-plan.md`)
- prioritized capture corridors across Phnom Penh, national roads, and provinces

Task 133 adds:

- traffic sign collection protocol (`protocols/traffic-sign-collection-checklist.md`)
- per-class target tracker (`manifests/traffic_sign_target_tracker.template.csv`)

Task 134 (detailed ANPR collection) adds:

- vehicle + plate collection protocol (`protocols/anpr-vehicle-collection-checklist.md`)
- ANPR category target tracker (`manifests/anpr_vehicle_target_tracker.template.csv`)
- per-image vehicle metadata template (`manifests/vehicle_metadata.template.csv`)

Task 135 adds:

- dashcam recording protocol (`protocols/dashcam-recording-checklist.md`)
- per-session log (`manifests/dashcam_session_log.template.csv`)
- cumulative hours tracker (`manifests/dashcam_hours_tracker.template.csv`)

Task 136 adds:

- dataset organization protocol (`protocols/dataset-organization-checklist.md`)
- organization action log (`manifests/dataset_organization_log.template.csv`)
- organization utility (`scripts/organize_dataset.py`)

Task 137 adds:

- canonical metadata template (`manifests/metadata.template.csv`)
- metadata collection protocol (`protocols/metadata-collection-guideline.md`)
- metadata validator (`scripts/validate_metadata.py`)

Task 138 adds:

- CVAT annotation workflow (`protocols/cvat-annotation-workflow.md`)
- CVAT label definitions (`labels/cvat/project-labels.json`)
- annotation batch log (`manifests/annotation_batch_log.template.csv`)
- YOLO export validator (`scripts/validate_yolo_export.py`)
- vehicle classes in `labels/yolo/classes.txt` and `class-map.json`

Task 139 adds:

- dataset validation protocol (`protocols/dataset-validation-checklist.md`)
- validation report template (`manifests/dataset_validation_report.template.json`)
- comprehensive dataset validator (`scripts/validate_dataset.py`)

Task 140 adds:

- dataset split protocol (`protocols/dataset-split-protocol.md`)
- split utility (`scripts/split_dataset.py`)
- output split folders under `splits/train|val|test/`

Task 141 adds:

- OCR dataset creation protocol (`protocols/ocr-dataset-creation.md`)
- OCR build utility (`training/ocr/build_ocr_dataset_from_splits.py`)
- OCR transcription filler (`training/ocr/fill_transcriptions.py`)
- OCR manifest validator (`scripts/validate_ocr_manifest.py`)

Task 142 adds:

- final dataset review protocol (`protocols/final-dataset-review.md`)
- review utility (`scripts/final_dataset_review.py`)
- backup log template (`manifests/dataset_backup_log.template.csv`)
- review report (`manifests/final_dataset_review_report.json`)

```bash
cd ai-service
python data/datasets/scripts/final_dataset_review.py
```

## Prohibitory reference import (Cambodia catalog)

Import 46 prohibitory sign graphics from the reference PDF folder:

```bash
cd ai-service
python data/datasets/scripts/import_prohibitory_reference.py
```

Outputs:

- `raw/traffic-signs/reference/prohibitory-cambodia/` — source copies
- `processed/traffic-signs/prohibitory-reference/` — renamed files
- `annotations/exports/BATCH-REF-PROH-001/` — YOLO images + auto labels
- `manifests/prohibitory_reference_manifest.csv` — per-file class mapping

See `annotations/exports/BATCH-REF-PROH-001/README.md`.

