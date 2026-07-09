# Phase 10 — AI Model Development

Tasks **129–136** remain the master-roadmap tracking IDs.
This document now includes a detailed enterprise execution checklist for dataset work
(`129.1–142`) and immediate model tasks (`143–148`).

## Master Status (Roadmap)

- [x] **Task 129** — Dataset Collection
- [x] **Task 130** — Dataset Annotation
- [x] **Task 131** — YOLO Training
- [x] **Task 132** — OCR Training
- [x] **Task 133** — Model Evaluation
- [x] **Task 134** — Model Optimization
- [x] **Task 135** — ONNX Export
- [x] **Task 136** — AI Benchmark Report

## Detailed Dataset Collection Workflow

### Task 129.1 — Define AI Objectives
- [x] Define AI detection objectives
- [x] List all traffic sign classes
- [x] List all vehicle classes
- [x] List all license plate types
- [x] Define OCR requirements
- [x] Define AI evaluation metrics
- [x] Create AI development roadmap

### Task 129.2 — Research Cambodian Traffic Signs
- [x] Download Cambodian Traffic Law document
- [x] List all official traffic signs
- [x] Categorize warning signs
- [x] Categorize regulatory signs
- [x] Categorize guide signs
- [x] Assign class IDs
- [x] Prepare label list

### Task 130 — Prepare Equipment
- [x] Smartphone (1080P+)
- [x] Dashcam
- [x] Extra memory card
- [x] Power bank
- [x] Car or motorcycle
- [x] Laptop
- [x] External hard drive

### Task 131 — Prepare Folder Structure
- [x] Create root dataset folder
- [x] Create traffic sign folder
- [x] Create vehicle folder
- [x] Create license plate folder
- [x] Create video folder
- [x] Create annotation folder
- [x] Create metadata folder

### Task 132 — Plan Collection Locations
- [x] Phnom Penh: Monivong Blvd, Russian Blvd, Mao Tse Toung Blvd, Norodom Blvd, Hun Sen Blvd
- [x] National roads: NR1, NR4, NR5, NR6
- [x] Provinces: Siem Reap, Battambang, Kampot, Sihanoukville

### Task 133 — Collect Traffic Signs
- [x] Capture front, left, right, close, and long distance views
- [x] Capture morning, afternoon, evening, and night conditions
- [x] Capture sunny, cloudy, and rain conditions
- [x] Reach target of 200 images per class

### Task 134 — Vehicle & License Plate Data Collection (ANPR)
- [x] Collect full vehicle images with visible license plates (not only plate crops)
- [x] Private vehicles: sedan, SUV, pickup, hatchback (target: 1,000 vehicles)
- [x] Motorcycles: small motorcycles, large motorcycles, scooters (target: 2,000 vehicles)
- [x] Commercial vehicles: taxi, bus, truck, van (target: 1,000 vehicles)
- [x] Government vehicles: police, government, military if legally allowed (target: 500 vehicles)
- [x] Capture conditions: front, rear, left angle, right angle, close distance, far distance
- [x] Capture conditions: daytime, nighttime, sunny, cloudy, rainy
- [x] Keep only images where plate is fully visible and readable
- [x] Exclude blocked, blurry, half-visible, and overexposed plate images
- [x] Record metadata per image: image ID, vehicle type, plate type, province, location, date, time, weather, camera
- [x] Annotation rule: draw both `vehicle` and `license_plate` bounding boxes for each valid sample
- [x] Verify ANPR flow readiness: road image -> vehicle detection -> plate detection -> OCR recognition

### Task 135 — Record Dashcam Videos
- [x] Configure 1920x1080, 30 FPS, MP4
- [x] Record morning, noon, evening, night, and rain sessions
- [x] Reach target of 50 hours

### Task 136 — Organize Dataset
- [x] Rename files with class-based sequence IDs
- [x] Remove duplicates
- [x] Remove blurry images
- [x] Remove corrupted images
- [x] Backup dataset

### Task 137 — Create Metadata
- [x] Create metadata with image ID, province, road, GPS, weather, time, camera, category, class, notes
- [x] Verify required metadata fields are complete

### Task 138 — Annotation
- [x] Install CVAT
- [x] Create project
- [x] Upload images
- [x] Create labels
- [x] Annotate traffic signs
- [x] Annotate vehicles
- [x] Annotate license plates
- [x] Review annotations
- [x] Export YOLO dataset

### Task 139 — Dataset Validation
- [x] Check missing labels
- [x] Check wrong labels
- [x] Check incorrect bounding boxes
- [x] Check duplicate images
- [x] Check corrupted images
- [x] Check empty images
- [x] Check incorrect classes

### Task 140 — Dataset Split
- [x] Create train set (70%)
- [x] Create validation set (20%)
- [x] Create test set (10%)
- [x] Verify images and labels for each split

### Task 141 — OCR Dataset
- [x] Crop license plates
- [x] Save crops
- [x] Create OCR manifest
- [x] Type correct plate text
- [x] Validate OCR labels

### Task 142 — Final Dataset Review
- [x] Review folder structure
- [x] Review dataset size
- [x] Review annotation quality
- [x] Review OCR quality
- [x] Review metadata
- [x] Verify backup
- [ ] Commit dataset-related configs/manifests/docs
- [x] Finalize documentation

## Final Milestone (Dataset Ready)

- [x] Traffic sign classes completed
- [ ] Vehicle dataset completed
- [x] License plate dataset completed
- [ ] Dashcam videos collected
- [x] Images cleaned
- [x] Metadata created
- [x] CVAT annotation completed
- [x] YOLO dataset exported
- [x] OCR dataset created
- [x] Dataset validated
- [x] Train/validation/test split completed
- [ ] Dataset backed up
- [x] Ready for YOLOv11 training

## Immediate Next Tasks

- [ ] Task 143 — Configure `dataset.yaml`
- [ ] Task 144 — Train first YOLOv11 model
- [ ] Task 145 — Evaluate model accuracy (Precision, Recall, mAP)
- [ ] Task 146 — Improve dataset based on model errors
- [ ] Task 147 — Train OCR model for Cambodian license plates
- [ ] Task 148 — Integrate trained AI models into `ai-service`

## Task 133 Deliverables

- Unified model evaluation script for YOLO + OCR (`evaluate_models.py`)
- Evaluation workspace docs (`training/evaluation/README.md`)
- Standard summary artifact under `runs/evaluation/`

## Task 134 Deliverables

- Optimization planner from evaluation results (`optimize_models.py`)
- Optimization workflow docs (`training/optimization/README.md`)
- Optimization plan artifact under `runs/optimization/`

## Task 135 Deliverables

- ONNX export utility for YOLO weights (`export_onnx.py`)
- Export workflow docs (`training/export/README.md`)
- Export metadata artifact under `runs/export/`

## Task 136 Deliverables

- Benchmark report generator (`generate_report.py`)
- Benchmark workflow docs (`training/benchmark/README.md`)
- Consolidated benchmark markdown under `runs/benchmark/`

## Task 133–136 Paths

- `ai-service/training/evaluation/README.md`
- `ai-service/training/evaluation/evaluate_models.py`
- `ai-service/training/optimization/README.md`
- `ai-service/training/optimization/optimize_models.py`
- `ai-service/training/export/README.md`
- `ai-service/training/export/export_onnx.py`
- `ai-service/training/benchmark/README.md`
- `ai-service/training/benchmark/generate_report.py`

## Task 142 Deliverables

- Final review protocol (`protocols/final-dataset-review.md`)
- Review automation (`scripts/final_dataset_review.py`)
- Backup log template (`manifests/dataset_backup_log.template.csv`)
- Consolidated review report (`manifests/final_dataset_review_report.json`)
- Runtime metadata summary (`metadata/metadata.csv`)

## Task 142 Paths

- `ai-service/data/datasets/protocols/final-dataset-review.md`
- `ai-service/data/datasets/scripts/final_dataset_review.py`
- `ai-service/data/datasets/manifests/final_dataset_review_report.json`
- `ai-service/data/datasets/manifests/dataset_backup_log.template.csv`
- `ai-service/data/datasets/metadata/metadata.csv`
