# Phase 10 — AI Evaluation

## ROC curves

ROC curves are **not used** for YOLO object detection in this project. Detection quality is measured with mAP@50, mAP@50-95, per-class P/R/F1, PR curves, and confusion matrices (standard for Ultralytics YOLO).

## Run evaluation

```bash
python ai/evaluation/run_phase10.py
```
