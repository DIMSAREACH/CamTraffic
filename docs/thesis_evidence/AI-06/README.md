# AI-06 Training Evidence (CamTraffic)

Generated: 2026-06-05 09:45 UTC

## Model

- Weights: `ai/weights/best.pt`
- Training run: `ai/weights/camtraffic_signs3`
- Classes: **19** Cambodia traffic signs

## Final validation metrics (epoch 30)

| Metric | Value |
| ------ | ----- |
| Precision | 0.7639 |
| Recall | 0.7799 |
| mAP@0.5 | 0.9061 |
| mAP@0.5:0.95 | 0.8812 |

- Dataset: 131 train / 24 val images

## Trained sign codes

- `PW03-R1-08`
- `PW03-R1-09`
- `PW03-R2-01`
- `PW03-R2-04`
- `PW03-R2-03`
- `PW03-R2-05`
- `PW03-R2-06`
- `PW03-R2-08`
- `PW03-R2-02`
- `PW03-R2-07`
- `PW03-R1-01`
- `PW03-R1-19`
- `PW03-R1-02`
- `PW03-R2-09`
- `PW03-R1-03`
- `PW03-R1-06`
- `PW03-R1-05`
- `PW03-R1-07`
- `PW03-R1-10`

## Files for thesis screenshots

### Training plots (`training/`)

- `training/results.png`
- `training/confusion_matrix.png`
- `training/confusion_matrix_normalized.png`
- `training/PR_curve.png`
- `training/F1_curve.png`
- `training/P_curve.png`
- `training/R_curve.png`
- `training/val_batch0_labels.jpg`
- `training/val_batch0_pred.jpg`
- `training/val_batch1_labels.jpg`
- `training/val_batch1_pred.jpg`
- `training/val_batch2_labels.jpg`
- `training/val_batch2_pred.jpg`

### Sample predictions (`predictions/`)

Annotated bounding boxes on held-out validation images.

- `predictions/AXLE_WEIGHT_LIMIT_WEIGHT LIMIT ON ONE AXLE_06_prediction.jpg`
- `predictions/NO_ENTRY_BICYCLE_MOTORCYCLE_TRICYCLE_NO ENTRY FOR BICYCLE, MOTORCYCLE AND TRICYCLE_01_prediction.jpg`
- `predictions/NO_ENTRY_BICYCLE_MOTORCYCLE_TRICYCLE_NO ENTRY FOR BICYCLE, MOTORCYCLE AND TRICYCLE_06_prediction.jpg`
- `predictions/NO_ENTRY_BICYCLE_NO ENTRY FOR BICYCLE_00_prediction.jpg`
- `predictions/NO_ENTRY_LARGE_TRUCK_NO ENTRY FOR LARGED-SIZED TRUCK_05_prediction.jpg`
- `predictions/NO_ENTRY_MOTOR_EXCEPT_MOTORCYCLE_No entry  for motor vehicles except motorcycles without side carts_07_prediction.jpg`
- `predictions/NO_ENTRY_MOTOR_VEHICLES_No entry for motor vehicles_00_prediction.jpg`
- `predictions/NO_ENTRY_MOTOR_VEHICLES_No entry for motor vehicles_04_prediction.jpg`
- `predictions/NO_ENTRY_MOTORCYCLE_DRAWN_NO ENTRY FOR MOTORCYCLE DRAWN VEHICLES_04_prediction.jpg`
- `predictions/NO_LEFT_TURN_No Left Turn_03_prediction.jpg`
- `predictions/NO_LEFT_TURN_No Left Turn_06_prediction.jpg`
- `predictions/NO_PARKING_NO PARKING_00_prediction.jpg`
- `predictions/NO_PARKING_NO PARKING_02_prediction.jpg`
- `predictions/NO_PARKING_NO PARKING_03_prediction.jpg`
- `predictions/NO_RIGHT_TURN_No Right Turn_05_prediction.jpg`
- `predictions/NO_RIGHT_TURN_No Right Turn_06_prediction.jpg`
- `predictions/NO_STOPPING_No stopping_02_prediction.jpg`
- `predictions/NO_STOPPING_No stopping_03_prediction.jpg`
- `predictions/NO_U_TURN_NO U TURN_07_prediction.jpg`
- `predictions/ROAD_CLOSED_ALL_USERS_CLOSE FOR ALL ROAD USERS_00_prediction.jpg`
- `predictions/ROAD_CLOSED_ALL_USERS_CLOSE FOR ALL ROAD USERS_04_prediction.jpg`
- `predictions/ROAD_CLOSED_ALL_USERS_CLOSE FOR ALL ROAD USERS_05_prediction.jpg`
- `predictions/ROAD_CLOSED_ALL_VEHICLES_CLOSE FOR ALL VEHICLES_07_prediction.jpg`
- `predictions/TOTAL_WEIGHT_LIMIT_TOTAL WEIGHT LIMIT_06_prediction.jpg`

## Suggested thesis captions

- **results.png** — Training/validation loss and mAP curves over 30 epochs.
- **confusion_matrix_normalized.png** — Per-class detection accuracy on validation set.
- **val_batch0_pred.jpg** — YOLO validation batch with predicted boxes.
- **predictions/** — Individual sign images with live model inference overlay.

## Regenerate

```bash
python scripts/export_ai06_evidence.py
```
