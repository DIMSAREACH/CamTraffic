# CamTraffic — AI Dataset Backup

Complements `deploy/env/BACKUP.md` (application DB + media). Dataset media is **large** and **gitignored** — back up separately.

## What to back up

| Path | Priority | Notes |
|------|----------|-------|
| `ai/dataset/` | High | Full 236-class YOLO sign set |
| `ai/dataset_10/` | High | 10-class production training set |
| `ai/datasets/manifests/` | High | Tracked in Git; also copy to HDD |
| `ai/datasets/annotations/` | High | CVAT exports, QA lists, OCR manifest |
| `ai/datasets/splits/` | High | train/val/test YOLO splits |
| `ai/datasets/raw/` | Medium | Field captures, Roboflow imports |
| `ai/weights/` | High | `best.pt`, checkpoints |
| `ai/runs/` | Low | Reproducible from weights + dataset |

## Recommended schedule

1. **After each import batch** — copy new files from `ai/datasets/raw/` to external HDD.
2. **Weekly** — run `python ai/scripts/collection_tracker.py --write-manifest` and archive `ai/datasets/manifests/`.
3. **Before training** — snapshot `ai/dataset_10/` + `ai/weights/`.
4. **Quarterly** — full `ai/` tree to encrypted external drive (exclude `__pycache__`, `.venv`).

## Commands

```powershell
# Manifest + stats (small, commit to Git)
python ai/scripts/collection_tracker.py --write-manifest

# Optional: include datasets in system backup (large)
# backend/.env
BACKUP_INCLUDE_AI_WEIGHTS=true
```

System ZIP backup (`python manage.py backup_system`) includes AI weights when enabled; **does not** include full `ai/dataset/` by default — copy manually.

## Restore checklist

- [ ] Restore `ai/dataset/` and `ai/dataset_10/` to same paths
- [ ] Restore `ai/weights/best.pt`
- [ ] Run `python ai/scripts/validate_dataset.py --dataset ai/dataset_10`
- [ ] Run `python ai/scripts/collection_tracker.py --write-manifest`

## Privacy

- Blur license plates in road footage before sharing outside thesis team.
- Do not commit PII or raw plate crops to Git — see Phase 7 data privacy task.
