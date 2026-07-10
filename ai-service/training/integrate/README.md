# Model Integration (Task 148)

Deploy trained weights into the runtime `ai-service/models/` directory.

```bash
cd ai-service
python training/integrate/deploy_models.py \
  --yolo-weights runs/yolo/camtraffic-v1/weights/best.pt \
  --target-name yolov11_camtraffic_v1.pt
```

Set runtime env:

```bash
AI_YOLO_WEIGHTS=yolov11_camtraffic_v1.pt
AI_DETECTION_MODE=yolo
```
