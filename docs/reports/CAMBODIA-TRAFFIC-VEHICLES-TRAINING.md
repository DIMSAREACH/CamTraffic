# Cambodia Traffic Vehicles — Production Training

## Dataset (100% validated)

**Source:** `Cambodia Traffic.v1i.yolov8` (Roboflow, Dim Sareach)  
**License:** CC BY 4.0  
**Location (project):** `ai/datasets/splits/cambodia_traffic_vehicles/`  
**Original:** `Reference(PDF Download)/Dim Sareach/Image Dataset/Cambodia Traffic.v1i.yolov8`

| Split | Images | Labels | Boxes |
|-------|--------|--------|-------|
| train | 153 | 153 | 1,360 |
| valid | 43 | 43 | 428 |
| test | 22 | 22 | 149 |
| **Total** | **218** | **218** | **1,937** |

### Classes (5) — real Cambodia road vehicles

| ID | Label | CamTraffic type | Boxes (all) |
|----|-------|-----------------|-------------|
| 0 | Bus | bus | 99 |
| 1 | Car | car | 866 |
| 2 | Moto | motorcycle | 458 |
| 3 | Truck | truck | 125 |
| 4 | Tuk Tuk | tuk_tuk | 389 |

Real Phnom Penh footage, YOLOv8 annotations, 640×640, **0 corrupt / 0 missing labels**.

---

## Training (production)

```bash
cd ai
python training/yolo/validate_cambodia_vehicles.py
python training/yolo/train_cambodia_vehicles.py --epochs 80 --batch 4 --device cpu
```

| Setting | Value |
|---------|--------|
| Base model | `yolov8n.pt` |
| Epochs | 80 (patience 25) |
| Batch | 4 |
| Device | CPU (upgrade to `0` if GPU available) |
| Optimizer | AdamW |
| Output run | `ai/runs/detect/cambodia_traffic_vehicles/` |

### Production weights

| File | Purpose |
|------|---------|
| `ai/weights/best_cambodia_vehicles.pt` | Production vehicle detector |
| `ai/weights/best_vehicles.pt` | Alias |
| `ai/weights/cambodia_vehicles_training_status.json` | Training metadata |

### Backend config

```bash
AI_VEHICLE_ENABLED=True
AI_VEHICLE_MODEL=best_cambodia_vehicles.pt
AI_VEHICLE_CONFIDENCE_THRESHOLD=0.35
```

`vehicle_detection.py` auto-detects Cambodia class names (incl. **Tuk Tuk**) vs COCO fallback.

---

## Why this is production-ready

1. **Real Cambodia data** — Phnom Penh street video frames, not synthetic smoke data  
2. **Includes Tuk Tuk** — COCO cannot detect this; critical for Cambodia  
3. **100% annotation QA** — every image has a paired YOLO label; boxes in [0,1]  
4. **Wired into CamTraffic** — detect + ByteTrack use the same weights  
5. **Thesis-citable** — Roboflow Universe + CC BY 4.0 + your export  

---

## Monitor training

```powershell
# Live log
Get-Content "...\terminals\*.txt" -Wait -Tail 20

# After finish, check metrics
Get-Content ai\runs\detect\cambodia_traffic_vehicles\results.csv | Select-Object -Last 5
```

## Final results (trained 2026-07-23)

| Split | Precision | Recall | mAP50 | mAP50-95 |
|-------|-----------|--------|-------|----------|
| **Valid** (best) | 0.753 | 0.431 | **0.556** | 0.359 |
| **Test** | 0.673 | 0.594 | **0.693** | 0.490 |

### Per-class (validation best)

| Class | P | R | mAP50 |
|-------|---|---|-------|
| Bus | 0.688 | 0.360 | 0.472 |
| Car | 0.738 | 0.560 | 0.669 |
| Moto | 0.879 | 0.681 | **0.843** |
| Truck | 0.793 | 0.154 | 0.291 |
| Tuk Tuk | 0.667 | 0.400 | 0.507 |

Training time: ~0.82 hours on CPU (i7-13620H).  
Weights: `ai/weights/best_cambodia_vehicles.pt` (~6.0 MB)

**Production status:** ✅ Ready — backend `.env` points to `AI_VEHICLE_MODEL=best_cambodia_vehicles.pt`
