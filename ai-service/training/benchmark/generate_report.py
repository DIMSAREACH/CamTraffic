"""Task 136 — Generate AI benchmark markdown report."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate AI benchmark report")
    parser.add_argument("--evaluation", default="runs/evaluation/model_eval_summary.json")
    parser.add_argument("--optimization", default="runs/optimization/optimization_plan.json")
    parser.add_argument("--export", dest="export_report", default="runs/export/onnx_export_report.json")
    parser.add_argument("--output", default="runs/benchmark/ai_benchmark_report.md")
    return parser.parse_args()


def resolve(path_arg: str) -> Path:
    path = Path(path_arg)
    return path if path.is_absolute() else SERVICE_ROOT / path


def load_json(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"Required input not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    args = parse_args()
    evaluation_path = resolve(args.evaluation)
    optimization_path = resolve(args.optimization)
    export_path = resolve(args.export_report)
    output_path = resolve(args.output)

    evaluation = load_json(evaluation_path)
    optimization = load_json(optimization_path)
    export_report = load_json(export_path)

    detection = evaluation.get("detection", {})
    ocr = evaluation.get("ocr", {})
    actions = optimization.get("recommended_actions", [])

    generated_at = datetime.now(timezone.utc).isoformat()
    report = f"""# AI Benchmark Report (Task 136)

Generated at: {generated_at}

## Detection Metrics

- mAP50: {detection.get("map50", 0.0):.4f}
- mAP50-95: {detection.get("map50_95", 0.0):.4f}
- Precision: {detection.get("precision", 0.0):.4f}
- Recall: {detection.get("recall", 0.0):.4f}

## OCR Metrics

- Split: {ocr.get("split", "n/a")}
- Samples: {ocr.get("samples", 0)}
- Mean CER: {ocr.get("mean_cer", 0.0):.4f}
- Exact-match rate: {ocr.get("exact_match_rate", 0.0):.4f}

## Optimization Recommendations

"""
    for action in actions:
        report += f"- {action}\n"

    report += f"""

## ONNX Export

- Source weights: `{export_report.get("source_weights", "n/a")}`
- ONNX model: `{export_report.get("onnx_model", "n/a")}`
- Opset: {export_report.get("opset", "n/a")}
- Dynamic shape: {export_report.get("dynamic", False)}
- FP16 export: {export_report.get("half", False)}

## Conclusion

Phase 10 benchmark artifacts are complete and ready for integration/deployment decision-making.
"""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(report, encoding="utf-8")
    print(f"Benchmark report generated: {output_path}")


if __name__ == "__main__":
    main()
