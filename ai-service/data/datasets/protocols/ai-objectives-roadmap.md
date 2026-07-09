# AI Objectives & Roadmap (Task 129.1)

## 1) AI Detection Objectives

- Detect Cambodian traffic signs from roadside and dashcam imagery.
- Detect vehicles and visible license plates for ANPR-ready processing.
- Support operational conditions: day/night, rain, glare, shadow, occlusion.
- Produce structured outputs that can be consumed by `ai-service` and backend APIs.

## 2) Traffic Sign Classes (Initial Working Set)

1. `speed_limit_20`
2. `speed_limit_30`
3. `speed_limit_40`
4. `speed_limit_50`
5. `speed_limit_60`
6. `no_entry`
7. `stop`
8. `yield`
9. `no_u_turn`
10. `one_way`
11. `parking_prohibited`
12. `pedestrian_crossing`
13. `school_zone`
14. `traffic_light_signal`
15. `unknown_sign`

## 3) Vehicle Classes

- `car_sedan`
- `car_suv`
- `car_pickup`
- `car_hatchback`
- `motorcycle_small`
- `motorcycle_large`
- `scooter`
- `taxi`
- `bus`
- `truck`
- `van`
- `government_vehicle`
- `police_vehicle`

## 4) License Plate Types

- `license_plate_kh_private`
- `license_plate_kh_commercial`
- `license_plate_kh_government`

## 5) OCR Requirements

- Input from plate crops produced by detection pipeline.
- Recognize Khmer + Latin alphanumeric plate text where present.
- Preserve meaningful separators (for example, hyphens) when present.
- Return normalized plate strings plus confidence for downstream enforcement logic.
- Handle low-light and motion-blur cases with graceful degradation.

## 6) AI Evaluation Metrics

### Detection (YOLO)
- `mAP50`
- `mAP50-95`
- Precision
- Recall
- Per-class confusion/failure analysis

### OCR
- Mean Character Error Rate (CER)
- Exact-match rate
- Split-wise metrics (`train`, `val`, `test`)

### System-level
- End-to-end latency per frame/image
- Pipeline success rate (vehicle -> plate -> OCR)
- False positive rate for plate reads in no-plate scenes

## 7) AI Development Roadmap

1. Finalize objective classes and collection targets.
2. Collect and curate ANPR-ready vehicle images with visible plates.
3. Annotate signs, vehicles, and plate bounding boxes in CVAT.
4. Train baseline YOLO detection models.
5. Build OCR dataset from plate crops and train/evaluate OCR.
6. Evaluate with standard metrics and error analysis loops.
7. Optimize models for deployment constraints.
8. Export deployable artifacts (including ONNX) and benchmark.
9. Integrate into `ai-service` production pipeline and monitor.
