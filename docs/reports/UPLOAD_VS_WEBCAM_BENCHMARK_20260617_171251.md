# Upload vs Webcam Benchmark

Generated: 2026-06-17 17:12 UTC
Model: `ai/weights/best.pt` (10-class pilot)
Dataset samples: `ai/dataset_10/images`

## Summary

| Metric | Value |
|--------|-------|
| Classes tested | 10 |
| Upload + webcam correct | 4/10 |
| Same class_key (parity) | 9/10 |
| Upload OK, webcam wrong | 1 |

## Interpretation

- **Upload OK + webcam wrong** → OpenCV/webcam preprocessing or live hint path, not the YOLO model.
- **Both wrong** → model or sample image issue.
- **Different class same image** → pipeline parity bug (should not happen with `unified_prep=True`).

## Results

| Class | Expected | Upload | Conf | Webcam | Conf | Parity | Diagnosis |
|-------|----------|--------|------|--------|------|--------|-----------|
| NO_ENTRY | PW03-R1-04 | no_entry | 98.3% | no_entry | 98.3% | ✓ | OK — upload and webcam agree |
| NO_LEFT_TURN | PW03-R1-01 | no_left_turn | 88.0% | w_pedestrian_crossing | 91.7% | ✗ | WEBCAM FAIL — check preprocessing / hint / live path (not model) |
| NO_RIGHT_TURN | PW03-R1-02 | no_u_turn | 100.0% | no_u_turn | 100.0% | ✓ | BOTH FAIL — model or image quality |
| NO_U_TURN | PW03-R1-03 | no_u_turn | 88.0% | no_u_turn | 86.0% | ✓ | OK — upload and webcam agree |
| NO_PARKING | PW03-R2-10 | no_u_turn | 99.6% | no_u_turn | 99.6% | ✓ | BOTH FAIL — model or image quality |
| M_STOP | M-032 | no_u_turn | 99.6% | no_u_turn | 99.6% | ✓ | BOTH FAIL — model or image quality |
| P_SPEED_LIMIT_20_KM_H | P-029 | w_pedestrian_crossing | 94.7% | w_pedestrian_crossing | 94.7% | ✓ | BOTH FAIL — model or image quality |
| P_SPEED_LIMIT_50_KM_H | P-030 | w_pedestrian_crossing | 76.9% | w_pedestrian_crossing | 76.9% | ✓ | BOTH FAIL — model or image quality |
| W_PEDESTRIAN_CROSSING | W-040 | w_pedestrian_crossing | 99.7% | w_pedestrian_crossing | 99.7% | ✓ | OK — upload and webcam agree |
| I_ONE_WAY_TRAFFIC | I-064 | i_one_way_traffic | 100.0% | i_one_way_traffic | 100.0% | ✓ | OK — upload and webcam agree |

