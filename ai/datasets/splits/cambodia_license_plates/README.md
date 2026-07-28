# Cambodia License Plates (Detection + OCR)

Converted from Roboflow **License Plate.v3-license-plate_v1.yolov8**

- Detection: **1 class** `license_plate` (YOLO bbox)
- OCR GT: visible plate serial text + **printed province/city** (authoritative)

Province is taken from the Roboflow class suffix (`_PHNOMPENH`, `_BATTAMBANG`, …),
not from the leading digit of the serial (those often disagree on real Cambodia plates).

| File | Purpose |
|------|---------|
| `ocr_ground_truth.json` | Per-image plate + province GT |
| `class_to_plate.json` | Class id → plate serial |
| `class_to_plate_meta.json` | Full plate + province metadata |

Classes: 42 | Images with GT: 44 |
Province annotated: 42 | Digit≠printed province: 40
