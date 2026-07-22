# CVAT Annotation Workflow — CamTraffic

Phase 8 · Tasks 226–229 · Tool: [cvat.ai](https://app.cvat.ai)

## 1. Project setup

1. Create project **CamTraffic Combined** (detection).
2. Import labels from `ai/datasets/labels/cvat/project-labels.json` (31 classes).
3. Use **YOLO 1.1** as export format.

## 2. Task batches

| Batch | Images | Source | CVAT pack |
|-------|-------:|--------|-----------|
| Signs (production) | 123 | `ai/dataset_10/` | Pre-labeled — QA only |
| Signs (full) | 2,840 | `ai/dataset/` | Pre-labeled — spot check |
| Plates (seed) | 50 | `raw/license_plates/` | Auto bbox — refine in CVAT |
| Vehicles (seed) | 22 | `raw/vehicles/urban/` | `annotations/cvat_tasks/BATCH-VEHICLES-PENDING/` |

## 3. Import images

```bash
# Stage vehicle frames for CVAT upload
python ai/scripts/prepare_vehicle_cvat_pack.py
```

Upload folder contents from `ai/datasets/annotations/cvat_tasks/BATCH-VEHICLES-PENDING/images/`.

## 4. Annotate

- Draw tight bounding boxes around each object.
- Pick class from project label list (sign / vehicle / plate group).
- For plate crops: verify auto full-frame box; adjust if plate is off-center.
- Reject blurry frames (Laplacian score < 80).

## 5. Export

1. CVAT → Export task → **YOLO 1.1**.
2. Save ZIP to `ai/datasets/annotations/imports/<BATCH-ID>/`.
3. Run validation:

```bash
python ai/scripts/validate_yolo_export.py --dataset ai/datasets/annotations/imports/BATCH-ID
python ai/scripts/export_yolo_batch.py --batch BATCH-ID --mode yolo-copy --source ai/datasets/annotations/imports/BATCH-ID
```

## 6. Merge into splits

```bash
python ai/scripts/split_dataset.py --export BATCH-ID --output training_combined
python ai/scripts/verify_labels.py --dataset ai/datasets/splits/training_combined --update-yaml
python ai/scripts/validate_dataset.py --dataset ai/datasets/splits/training_combined
```

## 7. Versioning

Every export appends a row to `ai/datasets/annotations/annotation_batch_log.csv`.

Backup exports per `deploy/env/DATASET_BACKUP.md` after each CVAT session.
