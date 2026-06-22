# YOLO Dataset Label Audit — Review Report

**Generated:** 2026-06-17 (UTC)  
**Status:** Read-only review — **no dataset or label files were modified.**

---

## Dataset status

| Location | Images | YOLO `.txt` labels |
|----------|--------|-------------------|
| `ai/dataset/` | **Not built** (folder missing) | — |
| Reference corpus (`Road signs in Cambodia/`) | **239** source files, **236** classes | Derived from filename / folder mapping |
| `backend/media/signs/` | 1,939 catalog copies | None (not YOLO format) |

Because `ai/dataset/` does not exist on this machine, **Current Label** in the report is the **training ground truth** assigned by `ai/build_dataset.py` (filename → `class_key`), not a stored YOLO label file.

After you run `python ai/build_dataset.py`, re-run the audit to compare **actual `.txt` class IDs** vs YOLO predictions on each training image.

---

## Reports generated

| File | Scope | Rows |
|------|--------|------|
| [`yolo_label_audit_reference_only.csv`](./yolo_label_audit_reference_only.csv) | **Recommended** — 239 reference training sources | 239 |
| [`yolo_label_audit_reference_only_summary.txt`](./yolo_label_audit_reference_only_summary.txt) | Quick summary | — |
| [`yolo_label_audit_20260617_115159.csv`](./yolo_label_audit_20260617_115159.csv) | Reference + 318 extra `media/signs` codes | 557 |

### CSV columns

| Column | Meaning |
|--------|---------|
| **Image Name** | File name |
| **Image Path** | Full path on disk |
| **Source** | `reference` or `media/signs` or `dataset/train|val` |
| **Current Label** | Assigned training class (`class_key`) |
| **Suggested Label** | YOLOv8 `best.pt` top-1 prediction |
| **Confidence** | YOLO box confidence (%) |
| **Status** | `Correct` or `Suspected Error` |
| **YOLO Top-3** | Top three predictions with scores |

---

## Method

1. Load 236-class list from `ai/data.yaml`
2. Map each reference image → ground-truth `class_key` (`build_dataset.collect_sources`)
3. Composite sign on neutral 640×640 background (centered, **no mirror**, no random aug)
4. Run `ai/weights/best.pt` (YOLOv8)
5. Compare predicted class vs ground truth

---

## Results — reference corpus (primary)

| Metric | Count |
|--------|------:|
| Images audited | 239 |
| **Correct** (YOLO agrees with ground truth) | **2** |
| Suspected Error | 237 |
| No YOLO detection | 13 |

### Confirmed correct (2)

| Image | Current Label | YOLO Prediction | Confidence |
|-------|---------------|-----------------|------------|
| `No left turn.png` | `NO_LEFT_TURN` | `NO_LEFT_TURN` | 18.4% |
| `Detour to the left.png` | `W_DETOUR_TO_THE_LEFT` | `W_DETOUR_TO_THE_LEFT` | 5.3% |

### High-confidence mismatches (≥25%) — review these first

| Image | Current Label | Suggested Label | Confidence |
|-------|---------------|-----------------|------------|
| `Railway crossing post.png` | `I_RAILWAY_CROSSING_POST` | `I_FORWARD_AND_BACKWARD` | 62.8% |
| `Red-flag.png` | `W_RED_FLAG` | `I_FORWARD_AND_BACKWARD` | 50.2% |
| `Parking lot.png` | `I_PARKING_LOT` | `AXLE_WEIGHT_LIMIT` | 39.1% |
| `Chevron marker (to the right).png` | `I_CHEVRON_MARKER_TO_THE_RIGHT` | `I_EXPRESSWAY_ENDS` | 34.4% |
| `No U-turn.png` | `NO_U_TURN` | `NO_LEFT_TURN` | 31.8% |
| `No right turn.png` | `NO_RIGHT_TURN` | `NO_LEFT_TURN` | 29.0% |

### Prohibitory signs — YOLO confusion pattern

| Image | Current Label | YOLO suggests | Confidence |
|-------|---------------|---------------|------------|
| `No left turn.png` | `NO_LEFT_TURN` | `NO_LEFT_TURN` | 18.4% ✓ |
| `No right turn.png` | `NO_RIGHT_TURN` | `NO_LEFT_TURN` | 29.0% |
| `No U-turn.png` | `NO_U_TURN` | `NO_LEFT_TURN` | 31.8% |
| `No entry.png` | `NO_ENTRY` | `NO_LEFT_TURN` | 2.8% |
| `Stop.png` | `M_STOP` | `I_EXPRESSWAY_ENDS` | 2.8% |

**Interpretation:** Filename ground truth for prohibitory signs looks consistent; YOLO often collapses different turn/no-entry signs into `NO_LEFT_TURN`. This is a **model weakness**, not proof the reference PNG is mislabeled.

---

## Results — full audit (reference + media)

| Metric | Count |
|--------|------:|
| Total images | 557 |
| Correct | 2 |
| Suspected Error | 555 |
| No detection | 24 |

The expanded run adds 318 `media/signs` images. Some rows use **imperfect filename → class parsing** for Django upload suffixes (e.g. `NO-PARKING_AuJ2q8K.png`), which can inflate false “Suspected Error” rows. **Use the reference-only CSV for training-source review.**

---

## Likely mislabel categories

| Category | Assessment |
|----------|------------|
| **Reference filename mapping** | Generally aligned with `cambodia_stem_to_class.json` and `sign_catalog.json` |
| **YOLO vs ground truth** | Very low agreement on single composite frames (~0.8%) — model needs retraining / more augments |
| **Strong review candidates** | High-confidence YOLO disagreements (table above) — verify artwork visually |
| **Silhouette informative signs** | Often `NO_DETECTION` or random low-conf class (e.g. `Animal drawn carts.png`) |

---

## How to re-run

```bash
# Reference training sources only (recommended)
python scripts/audit_yolo_dataset_labels.py --output docs/reports/yolo_label_audit_reference_only.csv

# Include extra media/signs catalog images
python scripts/audit_yolo_dataset_labels.py --include-media-signs

# After building YOLO dataset — audits actual label .txt files
python ai/build_dataset.py
python scripts/audit_yolo_dataset_labels.py --output docs/reports/yolo_label_audit_from_dataset.csv
```

---

## Recommended next steps (manual — not applied)

1. **Build dataset:** `python ai/build_dataset.py` then re-run audit on `ai/dataset/images/*`
2. **Visually review** high-confidence mismatches in the CSV (filter `Confidence >= 25` and `Status = Suspected Error`)
3. **Retrain YOLO** with more augments / longer epochs — current `best.pt` generalizes poorly on held-out reference art
4. **Fix catalog media filenames** if any `media/signs` PNG stem does not match `sign_code` (separate from YOLO labels)

---

*Tool: `scripts/audit_yolo_dataset_labels.py` — read-only, no automatic file changes.*
