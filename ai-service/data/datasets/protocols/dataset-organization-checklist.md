# Dataset Organization Checklist (Task 136)

## Objective

Clean and standardize collected media before annotation, splitting, and training.

## Naming convention

Use class-based sequence IDs when files are promoted to `processed/`:

```text
STOP_000001.jpg
SPD40_000002.jpg
CAR_000003.jpg
MOTO_000004.jpg
```

Prefix guide:

| Prefix | Use for |
|--------|---------|
| `STOP`, `SPD20`, `SPD30`, ... | Traffic sign classes |
| `CAR`, `SUV`, `MOTO`, `BUS`, ... | Vehicle ANPR samples |
| `DASH` | Extracted dashcam frames (if frame-exported) |

Keep original raw filenames immutable under `raw/`; apply standardized names only in `processed/`.

## Organization workflow

1. Inventory all files under `raw/` subfolders.
2. Run `scripts/organize_dataset.py` for duplicate/blur/corruption screening.
3. Rename accepted files with class-based IDs into `processed/`.
4. Log removals and renames in `manifests/dataset_organization_log.csv`.
5. Backup accepted dataset to external storage.

## Quality actions

### Remove duplicates

- Compare perceptual/file hashes for exact duplicates.
- Keep highest-quality copy (sharpest, best exposure).

### Remove blurry images

- Flag low sharpness scores (Laplacian variance below threshold).
- Keep a small hard-case blur set only if intentionally documented.

### Remove corrupted images

- Reject unreadable/zero-byte/truncated files.

### Backup dataset

- Primary: external hard drive
- Secondary: secure cloud or NAS (if available)
- Verify restore test on a random sample after backup

## Completion criteria

Task 136 is complete when:

- Accepted files use consistent class-based naming in `processed/`
- Duplicates, blurry, and corrupted rejects are logged
- Backup verification is recorded in organization log

## Tooling

```bash
cd ai-service
python data/datasets/scripts/organize_dataset.py \
  --input-dir data/datasets/raw/traffic-signs \
  --output-dir data/datasets/processed/traffic-signs \
  --prefix STOP \
  --blur-threshold 80 \
  --log data/datasets/manifests/dataset_organization_log.csv
```
