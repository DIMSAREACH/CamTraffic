# Webcam Detection — Production Ready

## Modes

| Mode | Capture | Pipeline | Best for |
|------|---------|----------|----------|
| **Street** (default) | Full webcam frame (`webcam-street-*.jpg`) | Cambodia vehicles + plate-in-vehicle boxes; OCR on **Scan & Save** | Live traffic |
| **Sign** | Center guide-box crop | Sign YOLO + vote lock | Close-up traffic signs |

Toggle in the Webcam panel: **Street | Sign**.

---

## Production path

```
getUserMedia → full frame JPEG → POST /api/detection/image/
  full_frame=true, live_scan=true, enable_ocr=false (live)
→ YOLO vehicles (best_cambodia_vehicles.pt)
→ plate boxes on vehicle crops (best_cambodia_plates.pt)
→ LiveDetectionOverlay (cyan vehicles, amber plates)
```

Scan & Save sets `enable_ocr=true` for plate text + evidence log.

---

## Settings (`.env`)

```bash
AI_VEHICLE_MODEL=best_cambodia_vehicles.pt
AI_VEHICLE_CONFIDENCE_THRESHOLD=0.30
AI_VEHICLE_TRACKING_ENABLED=True
AI_PLATE_DETECT_MODEL=best_cambodia_plates.pt
AI_PLATE_DETECT_CONFIDENCE=0.25
AI_PLATE_OCR_ENABLED=True
AI_PIPELINE_DEMO_VIOLATION=False
AI_USE_MOCK=False
```

**Restart Django** after `.env` changes.

---

## Verify

```bash
cd src/backend
python scripts/test_webcam_street_detection.py
```

Uses Phnom Penh sample frames from video detection outputs.

---

## Portal demo

1. AI Detection Center → **Webcam**
2. Enable camera → leave mode on **Street**
3. Start live scan → vehicle/plate boxes on the live feed
4. **Scan & Save** for OCR + evidence record
5. Switch to **Sign** for guide-box traffic-sign detection

API aliases still work: `POST /api/detection/webcam/`, `POST /api/detection/live/` (same pipeline as image with live flags).
