# TS-03 — AI Detection Accuracy Evidence

Generated: 2026-06-05 12:51 UTC

## Summary

| Scenario | Images | Correct | Accuracy |
| -------- | ------ | ------- | -------- |
| Held-out validation (generic `IMG_*.jpg` upload names) | 24 | 14 | **58.3%** |
| Reference sign uploads (original filenames / UI samples) | 20 | 20 | **100.0%** |

Model: `D:\Year4\Project Thesis\Expert System\Project\CamTraffic\ai\weights\best.pt`  
Classes: 20

## Files

- `accuracy_results.csv` — full per-image results
- `accuracy_summary.json` — metrics for thesis / dashboard
- `accuracy_table.md` — copy-paste table (5+ samples)

## How to re-run

```bash
python scripts/run_ts03_accuracy_eval.py
```

Or via Django:

```bash
cd backend
python manage.py evaluate_sign_accuracy
```

## Sample results (held-out val, first 5)

| # | Image | Expected | Predicted | Confidence | Correct |
| - | ----- | -------- | --------- | ---------- | ------- |
| 1 | `AXLE_WEIGHT_LIMIT_WEIGHT LIMIT ON ONE AXLE_06.jpg` | PW03-R1-08 | PW03-R1-08 | 45.9% | Yes |
| 2 | `NO_ENTRY_BICYCLE_NO ENTRY FOR BICYCLE_01.jpg` | PW03-R2-04 | PW03-R1-04 | 88.0% | No |
| 3 | `NO_ENTRY_BICYCLE_NO ENTRY FOR BICYCLE_06.jpg` | PW03-R2-04 | PW03-R1-04 | 88.0% | No |
| 4 | `NO_ENTRY_FOR_MOTORCYCLE_NO ENTRY FOR MOTORCYCLE_05.jpg` | PW03-R2-11 | PW03-R1-04 | 88.0% | No |
| 5 | `NO_ENTRY_LARGE_BUS_No entry for larged-sized bus_04.jpg` | PW03-R2-05 | PW03-R1-04 | 88.0% | No |

## Notes for thesis

- **Held-out val** images are from `ai/dataset/images/val/` (not used in training split).
- Upload names are generic (`IMG_*.jpg`) to simulate real camera photos without filename hints.
- **Reference uploads** match the AI Detection demo (catalog / named reference files).
