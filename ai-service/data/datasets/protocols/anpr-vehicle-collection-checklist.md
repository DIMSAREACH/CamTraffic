# Vehicle & License Plate Collection — ANPR (Task 134)

## Pipeline context

Collect **full vehicle images** with visible plates so training matches production ANPR:

```text
Road Image
     │
     ▼
Vehicle Detection
     │
     ▼
License Plate Detection
     │
     ▼
OCR Recognition
     │
     ▼
Plate Number
```

Do **not** collect only pre-cropped plates as primary raw data.

## Correct vs incorrect samples

**Correct**

- Car, motorcycle, bus, or truck with a clearly visible plate in frame
- Plate readable at annotation zoom level
- Vehicle not fully blocked by another object

**Incorrect (reject)**

- Plate-only crop without vehicle context (for raw `raw/vehicles/`)
- Half-visible or covered plate
- Heavy blur or glare making plate unreadable
- Plate obscured by another vehicle

## Category targets

| Category | Subtypes | Target |
|----------|----------|-------:|
| Private | sedan, SUV, pickup, hatchback | 1,000 |
| Motorcycles | small, large, scooter | 2,000 |
| Commercial | taxi, bus, truck, van | 1,000 |
| Government | police, government, military (if legally allowed) | 500 |

Store accepted raw images under `raw/vehicles/`. Plate-focused exports may later land in `raw/license-plates/` only after QA from full frames.

## Capture conditions (per vehicle sample)

- Front, rear, left angle, right angle
- Close distance and far distance
- Daytime and nighttime
- Sunny, cloudy, rainy

## Plate visibility rules

Keep samples only when:

- License plate is fully visible
- Plate text is readable
- Vehicle is not blocked
- Image is not unusably blurry
- Plate is not overexposed or washed out

## Metadata (required per image)

Record rows in `manifests/vehicle_metadata.csv` (copy from `vehicle_metadata.template.csv`):

| Field | Example |
|-------|---------|
| image_id | `CAR_000001` |
| vehicle_type | `sedan` |
| plate_type | `license_plate_kh_private` |
| province | `Phnom Penh` |
| location | `Monivong Blvd` |
| date | `2026-07-08` |
| time | `08:35` |
| weather | `sunny` |
| camera | `smartphone` |
| view_angle | `front` |
| distance | `close` |
| notes | optional QA comment |

Track category progress in `manifests/anpr_vehicle_target_tracker.csv`.

## Annotation rule (CVAT / YOLO)

For each accepted image, create **two** boxes:

1. `vehicle` (car_sedan, motorcycle_small, bus, etc. — per project label set)
2. `license_plate_kh_private` | `license_plate_kh_commercial` | `license_plate_kh_government`

## Post-collection workflow

1. Copy full frames to `raw/vehicles/`.
2. Update target tracker and vehicle metadata manifests.
3. Annotate vehicle + plate boxes; export YOLO labels.
4. Run `training/ocr/prepare_crops.py` to build OCR crops after plate boxes exist.
5. Confirm end-to-end readiness: detection → crop → OCR → enforcement record.

## Completion criteria

Task 134 is complete when category targets are met (or documented shortfalls), metadata is filled for accepted samples, and a QA pass confirms ANPR-ready annotation coverage.
