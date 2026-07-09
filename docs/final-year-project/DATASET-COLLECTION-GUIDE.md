# Dataset Collection Guide

**Tasks 161–163 — Stage 6 AI Research & Validation**

---

## Overview

This guide covers collecting 500+ high-quality real-life images per category for training the CamTraffic YOLOv11 model on Cambodian road data.

---

## Task 161 — Collect Cambodian Traffic Sign Dataset (500+ images)

### Equipment
- Smartphone (1080p+) or dashcam
- Laptop for sorting and labeling
- Car or motorcycle for field collection

### Collection Locations
| Location | Sign Types Expected |
|----------|-------------------|
| Phnom Penh city roads | Speed limits, no-entry, one-way, pedestrian crossing |
| National Road 1 (to Vietnam border) | Speed limit signs |
| National Road 4 (to Sihanoukville) | Highway speed signs |
| School zones | School zone, pedestrian crossing |
| Roundabouts (Phnom Penh) | Yield, one-way |
| Parking areas | Parking prohibited |

### Photo Guidelines
- Distance: 5–30 m from sign
- Angles: front-facing + 15° left + 15° right (3 photos per sign)
- Lighting: daytime (morning + afternoon), overcast — avoid harsh noon shadows
- Include background context (not just cropped sign)
- Minimum resolution: 640 × 480
- Image format: JPEG

### Target per Sign Class
| Class | Current | Target | Needed |
|-------|--------:|-------:|-------:|
| speed_limit_20 | ~5 | 100 | 95 |
| speed_limit_30 | ~5 | 100 | 95 |
| speed_limit_40 | ~5 | 100 | 95 |
| speed_limit_50 | ~5 | 100 | 95 |
| speed_limit_60 | ~5 | 100 | 95 |
| no_entry | ~5 | 100 | 95 |
| stop | ~5 | 100 | 95 |
| yield | ~5 | 100 | 95 |
| no_u_turn | ~5 | 100 | 95 |
| one_way | ~5 | 100 | 95 |
| parking_prohibited | ~5 | 100 | 95 |
| pedestrian_crossing | ~5 | 100 | 95 |
| school_zone | ~5 | 100 | 95 |
| traffic_light_signal | ~5 | 100 | 95 |
| **Total Signs** | ~70 | **1,400** | **1,330** |

### Folder Structure
```
ai-service/data/datasets/raw/traffic_signs/
├── speed_limit_20/
│   ├── IMG_0001.jpg
│   └── ...
├── speed_limit_30/
└── ...
```

---

## Task 162 — Collect Cambodian Vehicle Dataset (500+ images)

### Target Vehicles
| Class | Min Images | Notes |
|-------|----------:|-------|
| car_sedan | 100 | Lexus, Toyota Camry, Honda Civic |
| car_suv | 100 | Toyota Fortuner, Land Cruiser, RAV4 |
| car_pickup | 100 | Toyota Hilux, Ford Ranger |
| car_hatchback | 80 | Honda Jazz, Toyota Yaris |
| motorcycle_small | 100 | Honda Dream, Wave |
| motorcycle_large | 100 | Big bikes, motodops |
| scooter | 100 | Honda Click, PCX |
| taxi | 80 | PassApp, Grab cars |
| bus | 80 | City buses, tourist buses |
| truck | 100 | Delivery trucks, cargo |
| van | 80 | Hyundai H-1, Toyota HiAce |
| government_vehicle | 60 | Government plates, military |
| police_vehicle | 60 | Traffic police motorcycles and cars |

### Photo Guidelines
- Front view (0°) + side view (90°) + rear view (180°) per vehicle
- Capture license plate clearly in at least 50% of images
- Multiple distances: near (10 m), medium (20 m), far (40 m)
- Mix of parking, moving (from roadside), and stopped vehicles
- Include variety of lighting: morning, afternoon, dusk

### Folder Structure
```
ai-service/data/datasets/raw/vehicles/
├── car_sedan/
├── car_suv/
├── motorcycle_small/
└── ...
```

---

## Task 163 — Collect Cambodian License Plate Dataset (500+ images)

### Plate Types
| Class | Description | Target |
|-------|------------|-------:|
| plate_number (class 14) | Standard white-blue plate (private) | 300+ |
| plate_khmer (class 15) | Khmer-only plates (commercial/old) | 100+ |
| plate_foreigner (class 16) | Diplomatic / foreign plates | 100+ |

### Collection Tips
- Photograph from front (straight, and ±10° angle)
- Ensure plate text is fully readable
- Collect from: parking lots, traffic stops, roadside
- Request permission or photograph in public areas
- Mix of clean vs dirty plates, various weather
- Distance: 2–10 m from plate

> **Privacy note**: Blur or anonymize plate numbers before publishing dataset publicly.
> For training only — keep dataset private.

### Folder Structure
```
ai-service/data/datasets/raw/plates/
├── plate_number/
├── plate_khmer/
└── plate_foreigner/
```

---

## Post-Collection Steps

After collecting images:

```bash
# 1. Verify image quality (blurry detection, min resolution)
python ai-service/data/datasets/scripts/verify_image_quality.py \
  --input-dir ai-service/data/datasets/raw/ \
  --min-width 640 --min-height 480 --blur-threshold 100.0

# 2. Remove duplicate images
python ai-service/data/datasets/scripts/dedup_images.py \
  --input-dir ai-service/data/datasets/raw/ \
  --output-dir ai-service/data/datasets/processed/

# 3. Upload to Roboflow for annotation
# See: ANNOTATION-GUIDE.md
```

---

## Progress Tracker

```bash
# Count images collected per class
python ai-service/data/datasets/scripts/verify_image_quality.py \
  --input-dir ai-service/data/datasets/raw/ --count-only
```
