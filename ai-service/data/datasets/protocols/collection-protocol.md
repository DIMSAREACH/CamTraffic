# Dataset Collection Protocol (Task 129)

## Objective

Collect a representative Cambodian traffic-sign and plate dataset across realistic
road conditions for detection and OCR training.

## Capture targets

- Urban and rural roads
- Day, night, dawn, rain, glare, and shadow
- Different camera heights/angles
- Motion blur and occlusion cases

## Batch workflow

1. Define collection plan (route, time window, operator, device).
2. Capture media to `raw/` with stable naming.
3. Log batch metadata in `manifests/collection_log.template.csv`.
4. Register source details in `manifests/sources.template.json`.
5. Run quality screening (remove unusable frames).
6. Move selected assets to `processed/` for annotation preparation.

## Naming convention

`YYYYMMDD_<province>_<cameraId>_<sequence>.jpg`

Example: `20260708_phnompenh_cam03_000145.jpg`

## Data governance

- Mask faces when not required for enforcement evidence.
- Store sensitive source videos in secured storage outside git.
- Keep traceability from processed sample back to capture source.
