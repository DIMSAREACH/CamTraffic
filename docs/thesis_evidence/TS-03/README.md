# TS-03 — AI Detection Accuracy Evidence

Generated: 2026-06-10 19:00 UTC

## Summary

| Scenario | Images | Correct | Accuracy |
| -------- | ------ | ------- | -------- |
| Held-out validation (generic `IMG_*.jpg` upload names) | 209 | 12 | **5.7%** |
| Reference sign uploads (original filenames / UI samples) | 0 | 0 | **0.0%** |

Model: `D:\Year4\Project Thesis\Expert System\Project\CamTraffic\ai\weights\best.pt`  
Classes: 236

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
| 1 | `HEIGHT_LIMIT_Height limit_00.jpg` | PW03-R1-09 | P-030 | 25.0% | No |
| 2 | `I_ABREAST_TRAVELLING_PERMITTED_FOR_BICYCLE_Abreast travelling permitted for bicycles_00.jpg` | I-038 | I-036 | 15.7% | No |
| 3 | `I_AIRPORTS_Airports_03.jpg` | I-039 | I-042 | 47.9% | No |
| 4 | `I_ANIMAL_DRAWN_CARTS_Animal drawn carts_02.jpg` | I-001 | W-022 | 5.1% | No |
| 5 | `I_ASIAN_HIGHWAY_ROUTE_1_Asian Highway route 1_05.jpg` | I-096 | I-003 | 27.7% | No |

## Notes for thesis

- **Held-out val** images are from `ai/dataset/images/val/` (not used in training split).
- Upload names are generic (`IMG_*.jpg`) to simulate real camera photos without filename hints.
- **Reference uploads** match the AI Detection demo (catalog / named reference files).
