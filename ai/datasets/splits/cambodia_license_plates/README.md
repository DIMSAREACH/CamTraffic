# Cambodia License Plates (Detection + OCR)

Converted from Roboflow **License Plate.v3-license-plate_v1.yolov8**

- Original: 42 classes (one per unique plate text) + mostly polygon labels
- Production: **1 class** `license_plate` + YOLO bbox (+ OCR ground truth)

| Split | Images | Boxes |
|-------|--------|-------|
| train | 31 | 31 |
| valid | 9 | 9 |
| test | 4 | 4 |

Polygons converted: 40 | BBoxes kept: 4

OCR GT: `ocr_ground_truth.json` (plate text from class names, e.g. `1AF-1714`)
