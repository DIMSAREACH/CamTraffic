# Phase B1 — Real Cambodian traffic sign photos

**Status:** Ready for demo testing (2026-07-23)

Your Dim Sareach image datasets are now linked into CamTraffic for AI Detection demos.

---

## What you already have (source)

| Dataset | Path | Contents |
|---------|------|----------|
| **Real road YOLO set** | `Reference(...)\Image Dataset\Cambodia Traffic Signs Dataset` | **2766** road snapshots + **2428** labels |
| **Clean sign references** | `Reference(...)\Image Dataset\Traffic Sign Detection Model (YOLOv8)` | Category folders (Prohibitory, Warning, …) |

---

## What was set up in the project

### 1. Curated demo signs (best for defense)

Folder: `ai/test_samples/real/`

| File | Sign |
|------|------|
| `01_stop.png` | Stop |
| `02_stop_bilingual.png` | Stop (Khmer + English) |
| `03_no_entry.png` | No Entry |
| `04_no_left_turn.png` | No Left Turn |
| `05_no_right_turn.png` | No Right Turn |
| `06_no_u_turn.png` | No U-Turn |
| `07_no_parking.png` | No Parking |
| `08_speed_20.png` | Speed Limit 20 |
| `09_speed_50.png` | Speed Limit 50 |
| `10_pedestrian_warning.png` | Pedestrian Crossing (warning) |
| `11_pedestrian_info.png` | Pedestrian Crossing (info) |
| `12_one_way.png` | One-way traffic |
| `13_yield.png` | Yield / Give way |
| `14_no_stopping.png` | No Stopping |

### 2. Sample real road frames

Folder: `ai/test_samples/real_road/` — 15 frames from your GoPro/NR videos (`road_01` … `road_15`).

### 3. Full dataset junctions (no huge copy)

```
ai/datasets/external/cambodia_traffic_signs_yolo  →  full 2766-image set
ai/datasets/external/cambodia_sign_reference      →  clean category PNGs
```

---

## How to test now

1. Confirm backend: log shows `Loaded sign YOLO: 248 classes`
2. Open Admin → http://localhost:5174 → login `admin@camtraffic.demo`
3. Open **AI Detection**
4. Upload first:
   - `ai/test_samples/real/03_no_entry.png`
   - `ai/test_samples/real/01_stop.png`
5. Then try a road frame: `ai/test_samples/real_road/road_01.jpg`

**Expected:** clean reference PNGs detect more reliably than distant road frames.

---

## Search more signs in your reference pack

Browse:

`ai/datasets/external/cambodia_sign_reference\`

Examples:
- `Prohibitory signs\No entry.png`
- `Priority signs\Stop.png`
- `Warning signs\Pedestrian crossing.png`

Copy any extra into `ai/test_samples/real/` for the viva.

---

## Later (B2 retrain)

Use the full YOLO set:

```
ai/datasets/external/cambodia_traffic_signs_yolo\
  images\   (2766)
  labels\   (2428)
```

Point a YOLO `data.yaml` at that folder when you retrain.

---

## AI story reminder

- Live model: **248 classes** (`best.pt`)
- Thesis mAP@50 = 0.908: **10-class** (`best_v2.pt`) only
