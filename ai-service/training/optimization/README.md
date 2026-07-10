# Model Optimization (Task 134)

Optimization helpers for preparing compact and fast inference artifacts.

## Scope

- Generate optimization plan from evaluation metrics
- Recommend confidence thresholds and deployment variants
- Prepare handoff metadata for ONNX export (Task 135)

## Quick start

```bash
cd ai-service
python training/optimization/optimize_models.py \
  --evaluation runs/evaluation/model_eval_summary.json \
  --output runs/optimization/optimization_plan.json
```
