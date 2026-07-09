# Metadata Collection Guideline (Task 137)

## Objective

Create standardized metadata records for every accepted dataset sample.

## Required fields

| Field | Description | Example |
|-------|-------------|---------|
| `image_id` | Unique image identifier | `SIGN_000001` |
| `province` | Capture province | `Phnom Penh` |
| `road` | Road or street segment | `Monivong Blvd` |
| `gps` | Latitude/longitude pair | `11.5564,104.9282` |
| `weather` | Weather condition | `sunny` |
| `time` | Capture time (24h preferred) | `08:35` |
| `camera` | Capture device | `smartphone`, `dashcam` |
| `category` | Data category | `traffic_sign`, `vehicle`, `license_plate` |
| `class` | Label class name | `stop`, `car_sedan`, etc. |
| `notes` | Optional QA/comment | free text |

## Workflow

1. Copy `manifests/metadata.template.csv` to `manifests/metadata.csv`.
2. Add one row per accepted sample.
3. Run `data/datasets/scripts/validate_metadata.py --file manifests/metadata.csv`.
4. Fix missing/invalid rows before annotation export.

## Validation rules

- All required fields except `notes` must be non-empty.
- `gps` should contain `lat,lon` numeric coordinates when available.
- `category` should be one of: `traffic_sign`, `vehicle`, `license_plate`, `dashcam_frame`.
- `time` should use `HH:MM` or `HH:MM:SS`.

## Completion criteria

Task 137 is complete when metadata template exists, field requirements are documented,
and metadata validation passes for runtime metadata files.
