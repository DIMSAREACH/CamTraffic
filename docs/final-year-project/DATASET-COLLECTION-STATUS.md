# Dataset Collection Status
> Generated: 2026-07-09T14:53:30.034113+00:00

## Summary
| Metric | Value |
|--------|-------|
| Total collected | 8548 |
| Total target    | 4100 |
| Overall %       | 208.5% |
| Classes ready   | 31 / 31 |

## Per-Class Inventory
| Class | Collected | Target | Gap | % | Status |
|-------|-----------|--------|-----|---|--------|
| no_entry | 150 | 150 | 0 | 100.0% | READY |
| no_u_turn | 100 | 100 | 0 | 100.0% | READY |
| no_left_turn | 180 | 100 | 0 | 180.0% | READY |
| no_right_turn | 180 | 100 | 0 | 180.0% | READY |
| no_overtaking | 160 | 80 | 0 | 200.0% | READY |
| no_horn | 160 | 80 | 0 | 200.0% | READY |
| parking_prohibited | 150 | 150 | 0 | 100.0% | READY |
| speed_limit_20 | 80 | 80 | 0 | 100.0% | READY |
| speed_limit_30 | 180 | 100 | 0 | 180.0% | READY |
| speed_limit_40 | 180 | 100 | 0 | 180.0% | READY |
| speed_limit_50 | 120 | 120 | 0 | 100.0% | READY |
| speed_limit_60 | 180 | 100 | 0 | 180.0% | READY |
| stop | 150 | 150 | 0 | 100.0% | READY |
| yield | 180 | 100 | 0 | 180.0% | READY |
| one_way | 180 | 100 | 0 | 180.0% | READY |
| pedestrian_crossing | 200 | 120 | 0 | 166.7% | READY |
| school_zone | 160 | 80 | 0 | 200.0% | READY |
| traffic_light_signal | 180 | 100 | 0 | 180.0% | READY |
| unknown_sign | 100 | 100 | 0 | 100.0% | READY |
| car_sedan | 1666 | 200 | 0 | 833.0% | READY |
| car_suv | 150 | 150 | 0 | 100.0% | READY |
| car_pickup | 150 | 150 | 0 | 100.0% | READY |
| motorcycle_small | 882 | 200 | 0 | 441.0% | READY |
| motorcycle_large | 744 | 150 | 0 | 496.0% | READY |
| bus | 191 | 120 | 0 | 159.2% | READY |
| truck | 242 | 120 | 0 | 201.7% | READY |
| van | 150 | 100 | 0 | 150.0% | READY |
| tuk_tuk | 150 | 100 | 0 | 150.0% | READY |
| plate_number | 953 | 500 | 0 | 190.6% | READY |
| plate_khmer | 200 | 200 | 0 | 100.0% | READY |
| plate_foreigner | 100 | 100 | 0 | 100.0% | READY |

## Available Pre-Split Datasets
| Dataset | Images |
|---------|--------|
| cambodia_traffic_reference_remapped | 196 |
| plate_number_reference_remapped | 453 |
| train | 1 |
| training_combined | 695 |

## Next Collection Priorities
Classes needing the most images (sorted by gap):


## Collection Checklist
- [ ] Traffic signs: photograph each class at multiple angles, distances, lighting
- [ ] Vehicles: capture at intersections, parking lots, roadside (day + night)
- [ ] License plates: capture varied plates (private, govt, tuk-tuk, foreigner)
- [ ] Minimum 640×480 resolution per image
- [ ] Run `dedup_images.py` after each collection session
- [ ] Run `verify_image_quality.py` to flag blurry/low-res images
- [ ] Annotate in Roboflow, export YOLO v8 format
- [ ] Run `verify_labels.py` after export
- [ ] Update `annotation_batch_log.csv` with batch number and date