# Annotation Guide

**Tasks 167–171 — Stage 6 AI Research & Validation**

---

## Overview

This guide covers annotating collected images using Roboflow, verifying label quality, and exporting in YOLO format for training.

---

## Task 167–169 — Annotate in Roboflow

### Step 1 — Create Roboflow Project
1. Go to [https://roboflow.com](https://roboflow.com) → **New Project**
2. Project name: `camtraffic-v2`
3. Annotation group: `Object Detection`
4. License: Private (for thesis use only)

### Step 2 — Upload Images
1. Click **Upload** → drag images from `ai-service/data/datasets/raw/`
2. Upload in batches per category (traffic signs first, then vehicles, then plates)

### Step 3 — Define Classes (31 classes)
Enter these class names **in exact order** (class ID 0–30):

| ID | Class Name | Type |
|----|-----------|------|
| 0 | speed_limit_20 | Traffic Sign |
| 1 | speed_limit_30 | Traffic Sign |
| 2 | speed_limit_40 | Traffic Sign |
| 3 | speed_limit_50 | Traffic Sign |
| 4 | speed_limit_60 | Traffic Sign |
| 5 | no_entry | Traffic Sign |
| 6 | stop | Traffic Sign |
| 7 | yield | Traffic Sign |
| 8 | no_u_turn | Traffic Sign |
| 9 | one_way | Traffic Sign |
| 10 | parking_prohibited | Traffic Sign |
| 11 | pedestrian_crossing | Traffic Sign |
| 12 | school_zone | Traffic Sign |
| 13 | traffic_light_signal | Traffic Sign |
| 14 | plate_number | License Plate |
| 15 | plate_khmer | License Plate |
| 16 | plate_foreigner | License Plate |
| 17 | unknown_sign | Traffic Sign |
| 18 | car_sedan | Vehicle |
| 19 | car_suv | Vehicle |
| 20 | car_pickup | Vehicle |
| 21 | car_hatchback | Vehicle |
| 22 | motorcycle_small | Vehicle |
| 23 | motorcycle_large | Vehicle |
| 24 | scooter | Vehicle |
| 25 | taxi | Vehicle |
| 26 | bus | Vehicle |
| 27 | truck | Vehicle |
| 28 | van | Vehicle |
| 29 | government_vehicle | Vehicle |
| 30 | police_vehicle | Vehicle |

### Step 4 — Draw Bounding Boxes

**Rules for tight, accurate boxes:**
- Box must **tightly** surround the object (not too loose, not cutting the edge)
- For traffic signs: include the sign board only, not the pole
- For vehicles: include the full vehicle body
- For plates: include only the plate frame, not surrounding bumper
- Label **every visible instance** in the image — do not skip partially visible objects

**Quality targets:**
- Min 2 annotators for cross-verification
- Review ≥ 20% of labels using Roboflow's **Dataset Health Check**

### Step 5 — Export YOLO Format

1. Roboflow → **Generate** → set train/val/test split: **70/20/10**
2. Enable **augmentations**: flip horizontal, brightness ±25%, rotation ±10°
3. **Export** → format: **YOLOv11** → download ZIP
4. Extract to:
   ```
   ai-service/data/datasets/splits/camtraffic_v2/
   ├── train/
   │   ├── images/
   │   └── labels/
   ├── val/
   │   ├── images/
   │   └── labels/
   └── test/
       ├── images/
       └── labels/
   ```

---

## Task 170 — Verify Annotations

Run the label verification script after export:

```bash
python ai-service/data/datasets/scripts/verify_labels.py \
  --labels-dir ai-service/data/datasets/splits/camtraffic_v2/train/labels \
  --num-classes 31
```

This checks:
- All class IDs are in range 0–30
- No bounding box coordinates outside [0, 1]
- No empty label files (images without annotations)
- Class distribution balance report

---

## Task 171 — Update dataset.yaml

After export and verification, update the training config:

```bash
# Update ai-service/training/yolo/dataset.yaml
# Change `path` to point to the new v2 dataset
python ai-service/data/datasets/scripts/verify_labels.py --update-yaml \
  --dataset-dir ai-service/data/datasets/splits/camtraffic_v2 \
  --output ai-service/training/yolo/dataset_v2.yaml
```

Then train using `dataset_v2.yaml`.

---

## Annotation Quality Checklist

- [ ] All 31 classes defined with correct IDs
- [ ] Every image has at least one annotation
- [ ] No class has fewer than 50 training examples
- [ ] Bounding boxes are tight (IoU with ground truth > 0.85)
- [ ] Dataset Health Check in Roboflow shows no red flags
- [ ] Label files exported in YOLO format (normalized xywh)
- [ ] `dataset.yaml` updated with correct paths
