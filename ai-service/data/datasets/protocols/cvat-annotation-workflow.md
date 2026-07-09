# CVAT Annotation Workflow (Task 138)

## Objective

Annotate traffic signs, vehicles, and license plates in CVAT and export a YOLO-ready dataset.

## 1) Install CVAT

Recommended options:

- **Docker (local):** [https://github.com/cvat-ai/cvat](https://github.com/cvat-ai/cvat)
- **CVAT Cloud:** [https://app.cvat.ai](https://app.cvat.ai)

Minimum requirements:

- Stable internet for cloud, or Docker + 8 GB RAM for local
- Browser: Chrome or Edge (latest)

## 2) Create project

1. Create project: `CamTraffic-Dataset-v1`
2. Task type: **Object detection**
3. Import label list from `labels/cvat/project-labels.json`
4. Enable attributes only if needed (keep boxes simple for YOLO export)

## 3) Upload images

Upload from organized folders:

- Traffic signs: `processed/traffic-signs/`
- Vehicles (ANPR): `processed/vehicles/` or `raw/vehicles/` after QA

Use batch uploads (500–1000 images per task) for manageable review cycles.

## 4) Create labels

Use project labels aligned with `labels/yolo/classes.txt`:

- Traffic sign classes (`stop`, `speed_limit_*`, etc.)
- Vehicle classes (`car_sedan`, `motorcycle_small`, `bus`, etc.)
- Plate classes (`license_plate_kh_*`)

Do not rename labels after export begins (class-ID stability).

## 5) Annotate traffic signs

- One box per sign
- Tight box around sign face
- Use `unknown_sign` only when sign is visible but unclassified

## 6) Annotate vehicles

For ANPR samples, draw a **vehicle** box around the full vehicle body.

## 7) Annotate license plates

On the same image, draw a separate **license plate** box.

Required pairing for ANPR images:

```text
Image
├── vehicle (e.g. car_sedan)
└── license_plate_kh_private | license_plate_kh_commercial | license_plate_kh_government
```

## 8) Review annotations

- Run QA using `labels/qa/annotation_qa_checklist.md`
- Double-review at least 10% per batch
- Log batch decisions in `manifests/annotation_batch_log.csv`

## 9) Export YOLO dataset

1. In CVAT: **Actions → Export task dataset → YOLO 1.1**
2. Save export under `annotations/exports/<batch_id>/`
3. Validate export:

```bash
cd ai-service
python data/datasets/scripts/validate_yolo_export.py \
  --images-dir data/datasets/annotations/exports/BATCH-001/images \
  --labels-dir data/datasets/annotations/exports/BATCH-001/labels
```

4. Copy validated export to `splits/` during Task 140.

## Completion criteria

Task 138 is complete when CVAT project exists, sign/vehicle/plate annotations are reviewed,
and at least one validated YOLO export is stored under `annotations/exports/`.
