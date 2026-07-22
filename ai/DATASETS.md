# Datasets (local only)

Training / YOLO datasets are **not** stored in this repository.

Recreate locally as needed:

| Path | Purpose |
|------|---------|
| `ai/dataset/` | Primary YOLO train/val layout |
| `ai/datasets/` | Raw / processed / splits collections |
| `ai/dataset_10/` | 10-class Cambodian sign subset |

These directories are listed in `.gitignore`. Keep weights under `ai/weights/` (also gitignored).
