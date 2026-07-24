# Video Upload AI Detection — Production Ready (Phnom Penh)

## What “Video upload” does

```
Upload .mp4/.webm → sample frames (default 12)
→ Cambodia YOLO vehicles (+ plate-in-vehicle crops) (+ signs)
→ clear bounding boxes on still + CSS overlay → annotated preview
```

| Layer | Module | Model / engine |
|-------|--------|----------------|
| Vehicles | `vehicle_detection.py` | `best_cambodia_vehicles.pt` |
| Plates | `plate_detection.detect_plate_boxes_near_vehicles` | `best_cambodia_plates.pt` on vehicle crops |
| OCR | `plate_ocr.py` | EasyOCR on plate crops |
| Overlays | OpenCV + `LiveDetectionOverlay` | Cyan vehicles · amber plates · violet signs |

API: `POST /api/detection/video/` (`DetectVideoView`)

---

## Real Phnom Penh footage

Clips tested:

1. Chaktomuk Walk Street busy traffic `.webm`
2. Riverside road vehicles & motorbikes `.webm`

```bash
cd src/backend
python scripts/test_phnom_penh_video_detection.py
```

### Results (12 frames / video)

| Video | Frames with boxes | Vehicles | Plates (in-vehicle) |
|-------|-------------------|----------|---------------------|
| Chaktomuk Walk Street | **12/12 (100%)** | 117 | 3 |
| Riverside road | **12/12 (100%)** | 65 | 1 |

Outputs: `ai/datasets/samples/phnom_penh_video_detect/`

---

## Clear boxes (production)

- Every sampled frame gets labeled vehicle boxes (Car / Motorcycle / Bus / Truck / Tuk Tuk).
- Plate YOLO runs **inside vehicle crops** (full-frame plate YOLO false-fires on street scenes).
- API returns `plate_bbox` / `plate_boxes` for CSS overlay (not only inferred zones).
- Giant false positives filtered by size/aspect.

### `.env`

```bash
AI_VEHICLE_MODEL=best_cambodia_vehicles.pt
AI_VEHICLE_CONFIDENCE_THRESHOLD=0.30
AI_PLATE_DETECT_MODEL=best_cambodia_plates.pt
AI_PLATE_DETECT_CONFIDENCE=0.25
AI_VIDEO_MAX_FRAMES=12
AI_VIDEO_MAX_MB=500
```

UI defaults: confidence **0.35**, max frames **12**.

**Restart Django** after `.env` / weight changes.

---

## Portal demo

1. Officer/Admin → **AI Detection Center** → **Video upload**
2. Drop a Phnom Penh `.webm`
3. Run Detect → labeled boxes on best still + frame summaries + annotated preview
