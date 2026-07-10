# ONNX Export (Task 135)

Export trained detection models to ONNX for deployment optimization.

## Quick start

```bash
cd ai-service
python training/export/export_onnx.py \
  --weights models/yolov11_traffic_signs_v1.pt \
  --output-dir models/exports \
  --imgsz 640
```

## Output

- ONNX model file under `models/exports/`
- Export metadata under `runs/export/onnx_export_report.json`
