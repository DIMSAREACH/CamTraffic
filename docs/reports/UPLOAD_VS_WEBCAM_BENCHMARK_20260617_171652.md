# Upload vs Webcam Benchmark

Generated: 2026-06-17 17:16 UTC
Model: `ai/weights/best.pt` (10-class pilot)
Dataset samples: `ai/dataset_10/images`

## Summary

| Metric | Value |
|--------|-------|
| Classes tested | 10 |
| Upload + webcam correct | 4/10 |
| Upload/webcam same class_key | 9/10 |
| Upload OK, webcam wrong | 1 |

## Interpretation

- **NO_ENTRY test**: upload `NO_ENTRY` + webcam `NO_ENTRY` on same image.
- **Upload OK + webcam wrong + upload engine `filename`** → filename hint on upload, not OpenCV preprocessing.
- **Upload/webcam same wrong class** → model confusion; parity OK.
- **Fair column** (`webcam-fair-benchmark.jpg`) = generic name YOLO-only baseline.
- **Different class same image** → pipeline parity bug (should not happen with `unified_prep=True`).

## Results

| Class | Expected | Upload | Eng | Webcam | Eng | Fair (YOLO) | Parity | Diagnosis |
|-------|----------|--------|-----|--------|-----|-------------|--------|-----------|
| NO_ENTRY | PW03-R1-04 | no_entry (98%) | yolo | no_entry (98%) | yolo | no_entry (98%) | ✓ | OK — upload and webcam agree (YOLO or same engine) |
| NO_LEFT_TURN | PW03-R1-01 | no_left_turn (88%) | filename | w_pedestrian_crossing (92%) | yolo | w_pedestrian_crossing (92%) | ✗ | WEBCAM FAIL — upload used filename hint; webcam relies on YOLO (not preprocessing) |
| NO_RIGHT_TURN | PW03-R1-02 | no_u_turn (100%) | yolo | no_u_turn (100%) | yolo | no_u_turn (100%) | ✓ | BOTH FAIL — model confusion (upload/webcam agree on wrong class) |
| NO_U_TURN | PW03-R1-03 | no_u_turn (88%) | filename | no_u_turn (86%) | yolo | no_u_turn (86%) | ✓ | OK — upload and webcam agree (YOLO or same engine) |
| NO_PARKING | PW03-R2-10 | no_u_turn (100%) | yolo | no_u_turn (100%) | yolo | no_u_turn (100%) | ✓ | BOTH FAIL — model confusion (upload/webcam agree on wrong class) |
| M_STOP | M-032 | no_u_turn (100%) | yolo | no_u_turn (100%) | yolo | no_u_turn (100%) | ✓ | BOTH FAIL — model confusion (upload/webcam agree on wrong class) |
| P_SPEED_LIMIT_20_KM_H | P-029 | w_pedestrian_crossing (95%) | yolo | w_pedestrian_crossing (95%) | yolo | w_pedestrian_crossing (95%) | ✓ | BOTH FAIL — model confusion (upload/webcam agree on wrong class) |
| P_SPEED_LIMIT_50_KM_H | P-030 | w_pedestrian_crossing (77%) | yolo | w_pedestrian_crossing (77%) | yolo | w_pedestrian_crossing (77%) | ✓ | BOTH FAIL — model confusion (upload/webcam agree on wrong class) |
| W_PEDESTRIAN_CROSSING | W-040 | w_pedestrian_crossing (100%) | yolo | w_pedestrian_crossing (100%) | yolo | w_pedestrian_crossing (100%) | ✓ | OK — upload and webcam agree (YOLO or same engine) |
| I_ONE_WAY_TRAFFIC | I-064 | i_one_way_traffic (100%) | yolo | i_one_way_traffic (100%) | yolo | i_one_way_traffic (100%) | ✓ | OK — upload and webcam agree (YOLO or same engine) |

