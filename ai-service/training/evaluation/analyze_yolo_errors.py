"""Task 146 — Analyze YOLO validation errors and propose dataset improvements."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from ultralytics import YOLO

SERVICE_ROOT = Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze YOLO errors for dataset improvement")
    parser.add_argument("--weights", required=True, help="YOLO weights path")
    parser.add_argument("--data", required=True, help="YOLO dataset yaml path")
    parser.add_argument(
        "--output",
        default="runs/evaluation/yolo_error_analysis.json",
        help="Error analysis report JSON",
    )
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold for analysis")
    return parser.parse_args()


def resolve(path_arg: str) -> Path:
    path = Path(path_arg)
    return path if path.is_absolute() else SERVICE_ROOT / path


def main() -> None:
    args = parse_args()
    weights = resolve(args.weights)
    data = resolve(args.data)
    output = resolve(args.output)

    model = YOLO(str(weights))
    metrics = model.val(data=str(data), split="val", conf=args.conf, verbose=False)

    class_names = model.names or {}
    per_class_map = getattr(metrics.box, "maps", None)
    weak_classes: list[dict[str, object]] = []
    if per_class_map is not None:
        for class_id, map_score in enumerate(per_class_map):
            if float(map_score) < 0.5:
                weak_classes.append(
                    {
                        "class_id": class_id,
                        "class_name": class_names.get(class_id, str(class_id)),
                        "map50_95": round(float(map_score), 4),
                    }
                )

    recommendations = [
        "Collect more samples for weak classes listed below.",
        "Add night/rain and angled viewpoints for low-performing vehicle/plate classes.",
        "Re-balance train/val split if a class has fewer than 50 training instances.",
        "Review mislabeled boxes in reference imports before next training run.",
    ]

    report = {
        "task": 146,
        "metrics": {
            "map50": float(getattr(metrics.box, "map50", 0.0)),
            "map50_95": float(getattr(metrics.box, "map", 0.0)),
            "precision": float(getattr(metrics.box, "mp", 0.0)),
            "recall": float(getattr(metrics.box, "mr", 0.0)),
        },
        "weak_classes": weak_classes,
        "recommendations": recommendations,
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Error analysis saved: {output}")


if __name__ == "__main__":
    main()
