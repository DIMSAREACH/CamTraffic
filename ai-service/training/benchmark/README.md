# AI Benchmark Report (Task 136)

Generate a single benchmark artifact combining evaluation, optimization, and export outputs.

## Inputs

- `runs/evaluation/model_eval_summary.json` (Task 133)
- `runs/optimization/optimization_plan.json` (Task 134)
- `runs/export/onnx_export_report.json` (Task 135)

## Quick start

```bash
cd ai-service
python training/benchmark/generate_report.py \
  --evaluation runs/evaluation/model_eval_summary.json \
  --optimization runs/optimization/optimization_plan.json \
  --export runs/export/onnx_export_report.json \
  --output runs/benchmark/ai_benchmark_report.md
```
