# Cambodia Traffic Vehicles Dataset

**Source:** `Cambodia Traffic.v1i.yolov8` (Roboflow)  
**Author export:** Dim Sareach  
**License:** CC BY 4.0  
**URL:** https://universe.roboflow.com/first-project-epqtc/cambodia-traffic/dataset/1

## Contents

| Split | Images | Labels |
|-------|--------|--------|
| train | 153    | 153    |
| valid | 43     | 43     |
| test  | 22     | 22     |
| **Total** | **218** | **218** |

## Classes (5)

| ID | Name | CamTraffic type |
|----|------|-----------------|
| 0 | Bus | bus |
| 1 | Car | car |
| 2 | Moto | motorcycle |
| 3 | Truck | truck |
| 4 | Tuk Tuk | tuk_tuk |

Real Phnom Penh road footage, YOLOv8 annotations, 640×640.

## Train (production)

```bash
cd ai
python training/yolo/validate_cambodia_vehicles.py
python training/yolo/train_cambodia_vehicles.py --epochs 80 --batch 4 --device cpu
```

Weights output:
- `ai/weights/best_cambodia_vehicles.pt`
- `ai/weights/best_vehicles.pt` (alias)

Backend `.env`:
```bash
AI_VEHICLE_ENABLED=True
AI_VEHICLE_MODEL=best_cambodia_vehicles.pt
AI_VEHICLE_CONFIDENCE_THRESHOLD=0.35
```

## Note

`train/`, `valid/`, `test/` are Windows junctions to the Reference Image Dataset folder so files are not duplicated.
