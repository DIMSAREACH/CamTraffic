# Annotation QA Checklist

Phase 8 · Task 234 · Complete per batch before train/val/test merge.

## Batch metadata

| Field | Value |
|-------|-------|
| Batch ID | |
| Annotator | |
| Reviewer | |
| Date | |
| CVAT task URL | |

## Automated checks

- [ ] `python ai/scripts/validate_yolo_export.py --export <BATCH-ID>` → 0 errors
- [ ] `python ai/scripts/verify_labels.py --dataset <path>` → class IDs in range
- [ ] `python ai/scripts/sample_verification.py --dataset <path>` → 10% sample reviewed

## Visual QA (10% random sample)

- [ ] Boxes are tight — no excessive padding
- [ ] Correct class for each box
- [ ] No missing objects in frame
- [ ] No duplicate boxes on same object
- [ ] Blurry / unreadable images rejected or re-captured

## Per-class spot check

| Class group | Sample size | Pass | Fail | Notes |
|-------------|------------:|-----:|-----:|-------|
| Traffic signs | | | | |
| Vehicles | | | | |
| License plates | | | | |

## OCR (plates only)

- [ ] `ocr_manifest.csv` transcriptions match plate text
- [ ] Province codes valid (PP, KPS, BTM, etc.)
- [ ] No PII beyond plate ID stored in shared exports

## Sign-off

- [ ] Batch logged in `annotations/annotation_batch_log.csv`
- [ ] Export backed up per `deploy/env/DATASET_BACKUP.md`
- [ ] Ready for `split_dataset.py` merge

**Reviewer signature:** ___________________ **Date:** ___________
