"""Task 134 — Build optimization plan from evaluation outputs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate model optimization plan")
    parser.add_argument(
        "--evaluation",
        default="runs/evaluation/model_eval_summary.json",
        help="Task 133 evaluation summary JSON",
    )
    parser.add_argument(
        "--output",
        default="runs/optimization/optimization_plan.json",
        help="Optimization plan JSON output path",
    )
    return parser.parse_args()


def resolve(path_arg: str) -> Path:
    path = Path(path_arg)
    return path if path.is_absolute() else SERVICE_ROOT / path


def propose_actions(evaluation: dict) -> list[str]:
    actions: list[str] = []
    map50 = evaluation.get("detection", {}).get("map50", 0.0)
    mean_cer = evaluation.get("ocr", {}).get("mean_cer", 1.0)

    if map50 < 0.75:
        actions.append("Increase traffic-sign training samples for weak classes before pruning.")
        actions.append("Tune YOLO hyperparameters (imgsz, epochs, augmentation).")
    else:
        actions.append("Run post-training quantization for detection model.")
        actions.append("Benchmark FP16 and INT8 variants on target hardware.")

    if mean_cer > 0.2:
        actions.append("Expand OCR labeled plate crops for hard weather/night scenarios.")
        actions.append("Tune OCR normalization and language configuration.")
    else:
        actions.append("Freeze OCR baseline and proceed to export/integration.")

    actions.append("Run Task 135 ONNX export for deployment candidates.")
    return actions


def main() -> None:
    args = parse_args()
    eval_path = resolve(args.evaluation)
    output_path = resolve(args.output)

    if not eval_path.exists():
        raise FileNotFoundError(f"Evaluation file not found: {eval_path}")

    evaluation = json.loads(eval_path.read_text(encoding="utf-8"))
    plan = {
        "task": 134,
        "input_evaluation": str(eval_path),
        "recommended_actions": propose_actions(evaluation),
        "deployment_targets": {
            "detection": ["PyTorch FP32", "ONNX FP16", "ONNX INT8 candidate"],
            "ocr": ["EasyOCR baseline", "custom recognition weights candidate"],
        },
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(plan, indent=2), encoding="utf-8")
    print(f"Optimization plan saved: {output_path}")


if __name__ == "__main__":
    main()
