# Dataset Quality Audit Report

Generated: 2026-06-17 16:14 UTC
Dataset: `D:\Year4\Project Thesis\Expert System\Project\CamTraffic\ai\dataset_10`
Classes (data.yaml): `D:\Year4\Project Thesis\Expert System\Project\CamTraffic\ai\dataset_10\data.yaml`

## Summary

| Metric | Value |
|--------|-------|
| Total images | 123 |
| Classes with images | 10 |
| Classes with zero images | 0 |
| Images with errors | 0 |
| Images with warnings | 2 |
| Total error flags | 0 |
| Total warning flags | 2 |
| Exact duplicate groups | 0 |
| Near-duplicate pairs | 1 |
| Classes with &lt;5 images | 0 |
| Blur threshold (Laplacian var) | 80.0 |

## Per-Class Summary

| Class Name | Image Count | Label Count | Possible Errors | Recommended Fixes |
|------------|-------------|-------------|-----------------|-------------------|
| I_ONE_WAY_TRAFFIC | 12 | 12 | — | — |
| M_STOP | 12 | 12 | — | — |
| NO_ENTRY | 12 | 12 | — | — |
| NO_LEFT_TURN | 12 | 12 | train/NO_LEFT_TURN_No left turn_01.jpg: overexposed (mean=220.8); 1 duplicate/near-duplicate group(s) | Review duplicate pairs; keep one canonical image per augmentation; Replace with sharper, well-lit reference captures |
| NO_PARKING | 12 | 12 | — | — |
| NO_RIGHT_TURN | 12 | 12 | — | — |
| NO_U_TURN | 12 | 12 | — | — |
| P_SPEED_LIMIT_20_KM_H | 12 | 12 | no validation images | Move or add 15–20% of images to val split |
| P_SPEED_LIMIT_50_KM_H | 12 | 12 | val/P_SPEED_LIMIT_50_KM_H_Speed limit 50 km-h_11.jpg: overexposed (mean=221.6) | Replace with sharper, well-lit reference captures |
| W_PEDESTRIAN_CROSSING | 15 | 15 | — | — |

## Duplicate Groups (sample)

- **near_dup_NO_LEFT_TURN_NO_LEFT_TURN_No left turn_04_NO_LEFT_TURN_No left turn_06**: NO_LEFT_TURN_No left turn_04.jpg, NO_LEFT_TURN_No left turn_06.jpg

## Notes

- This report is **read-only** — no dataset files were modified.
- Review label/filename mismatches manually before retraining.
- Low sharpness warnings use Laplacian variance on full composite images.
- Near-duplicates use perceptual hash (Hamming distance ≤ 6) within the same class.
