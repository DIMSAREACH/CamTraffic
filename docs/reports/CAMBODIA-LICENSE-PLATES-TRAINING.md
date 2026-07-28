# Cambodia License Plate Detection + OCR (Production)

## Source dataset

**License Plate.v3-license-plate_v1.yolov8** (Roboflow / Dim Sareach)  
- 44 images (31 train / 9 valid / 4 test)  
- Original: **42 classes** (one per unique plate text) + mostly **polygons**  
- Converted to production: **1 class** `license_plate` + YOLO boxes  

Converted path: `ai/datasets/splits/cambodia_license_plates/`

### Real Cambodia plate texts (from class names)

Examples: `1AF-1714`, `2BA-0565`, `1B-0515`, `2T-9274`, `3C-0272`, …

Full OCR ground truth: `ocr_ground_truth.json`

---

## Pipeline (clear OCR)

```
Image → YOLOv8 plate detect → crop plate → EasyOCR → Cambodia normalize (2A-1234)
```

| Step | Module | Weights / engine |
|------|--------|------------------|
| 1. Detect plate box | `plate_detection.py` | `best_cambodia_plates.pt` |
| 2. Read characters | `plate_ocr.py` | EasyOCR (`en` + allowlist) |
| 3. Normalize / province | `normalize_plate_text` | Cambodia formats + OCR repairs |

---

## Commands

```bash
cd ai

# 1) Convert Roboflow export → single-class YOLO + OCR GT
python training/yolo/prepare_cambodia_plates.py

# 2) Validate 100%
python training/yolo/validate_cambodia_plates.py

# 3) Train detector
python training/yolo/train_cambodia_plates.py --epochs 120 --batch 4 --device cpu

# 4) Evaluate detect + OCR vs ground truth
python training/yolo/eval_plate_ocr.py
```

### Backend `.env`

```bash
AI_PLATE_OCR_ENABLED=True
AI_PLATE_OCR_MIN_CONFIDENCE=0.45
AI_PLATE_DETECT_ENABLED=True
AI_PLATE_DETECT_MODEL=best_cambodia_plates.pt
AI_PLATE_DETECT_CONFIDENCE=0.25
```

**Restart Django** after training so the new weights load.

---

## Why conversion was required

Roboflow labeled **each plate text as its own class** (42 classes). That cannot generalize to new plates.

Production approach:
1. All boxes → class `0` = `license_plate` (detection)
2. Class names → OCR ground-truth strings (evaluation)
3. At runtime, **EasyOCR** reads any new Cambodia plate

---

## Status

| Check | Result |
|-------|--------|
| Annotation format valid | ✅ 44/44 images, 44 boxes |
| Polygons → bbox | ✅ 40 converted, 4 kept |
| OCR GT | ✅ 44 plate strings |
| Detector training | ✅ Early stop @ epoch 47 (patience 40) |
| Valid mAP50 | **0.984** (P=0.89, R=1.0) |
| Test mAP50 | **0.995** |
| Test mAP50-95 | **0.871** |
| Weights | `ai/weights/best_cambodia_plates.pt` (+ `best_plates.pt`) |
| Plate detect on full set | **44/44 (100%)** |
| Exact OCR match (strict) | **16–18 / 44 (~36–41%)** with Cambodia normalize |
| OCR wired | ✅ YOLO crop → EasyOCR → normalize |

### OCR notes (honest)

Detection is production-ready on this set. Exact character OCR is harder because:

- Dataset is small (44 images); many plates include province name text above the serial
- EasyOCR often confuses `1`/`4`, `O`/`Q`, `B`/`8`
- Non-standard labels (`HENGHENG`, `D.D.1611`) are not private `2A-1234` format

Normalize repairs (ghost digits, `4→1`, `0→Q`, serial trim) improve clarity for common Cambodia private plates. For higher exact OCR (80%+), next step is a dedicated plate CRNN/PaddleOCR model trained on more Cambodia crops.
