# Detection Pipeline Audit

Generated: 2026-06-17 14:48 UTC

## Model
- **best.pt path:** `D:\Year4\Project Thesis\Expert System\Project\CamTraffic\ai\weights\best.pt`
- **SHA256:** `a3130f8b8bfcb89c`
- **Django AI_MODEL_PATH:** `D:\Year4\Project Thesis\Expert System\Project\CamTraffic\ai\weights\best.pt`
- **YOLO classes:** 236

## Summary
- Images audited (upload+webcam pairs): 11
- Upload/webcam mismatches: 2
- Suspicious upload results: 10
- Prohibitory confusion flags: 0
- Mapping table suspicious rows: 0

## Required checks
| Check | Status |
|-------|--------|
| Same best.pt for upload & webcam | OK |
| class_id → class_name (model.names) | 236 entries |
| class_name → catalog sign_code | 236/236 resolved |
| Upload vs webcam parity | 9/11 match |

## Upload vs webcam mismatches

- `KH_NOUT_No U-turn.png`: upload=, webcam=PW03-R1-03
- `M-032.png`: upload=M-032, webcam=

## Multiple different signs → same output (ROOT CAUSE)

| YOLO Class | Sign Code | Sign Name | Images | Flag |
|---|---|---|---:|---|
|  | PW03-R1-01 | No Left Turn | 2 | repeated_output |
|  | PW03-R1-04 | No Entry | 2 | repeated_output |
|  |  | Unknown sign | 2 | repeated_output |
|  | M-032 | Stop | 2 | repeated_output |

## Output files
- `detection_class_mapping.csv` — YOLO class_id → sign_code
- `detection_suspicious_mappings.csv` — duplicate / missing mappings
- `detection_per_image_log.csv` — per-image YOLO + final result (upload & webcam)
- `detection_output_mapping_usage.csv` — Class Name, Sign Code, Sign Name, image count
