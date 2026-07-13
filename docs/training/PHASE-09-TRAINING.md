# CamTraffic — Phase 9 Training

## YOLO (signs production model)

```bash
# v1 bootstrap (5 epochs)
python ai/training/yolo/train.py --epochs 5 --name camtraffic-v1

# v2 Cambodia-tuned (50 epochs — use --epochs override via hyperparams.yaml)
python ai/training/yolo/train_v2.py --name camtraffic-v2

# Combined 31-class dataset (signs + vehicles + plates)
python ai/training/build_training_combined.py
python ai/training/yolo/train_v2.py --data ai/datasets/splits/training_combined/data.yaml --name camtraffic-combined

# Evaluation & export
python ai/training/yolo/post_train_eval.py --tag v2
python ai/training/yolo/compare_models.py
python ai/training/yolo/cross_validate.py
python ai/training/yolo/export_onnx.py
python ai/training/yolo/benchmark_fps.py
```

## OCR (plates)

```bash
python ai/training/ocr/ocr_baseline.py --limit 50
python ai/training/ocr/compare_engines.py
python ai/training/ocr/plate_edge_cases.py
python ai/training/ocr/verify_transcriptions.py
```

Weights: `ai/weights/best.pt` (v1), `ai/weights/best_v2.pt` (v2)  
Runs: `ai/runs/detect/` · Eval: `ai/runs/evaluation/`
