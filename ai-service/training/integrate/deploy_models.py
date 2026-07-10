"""Task 148 — Deploy trained weights into ai-service runtime models directory."""

from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Integrate trained models into ai-service/models")
    parser.add_argument(
        "--yolo-weights",
        required=True,
        help="Path to trained YOLO .pt weights (e.g. runs/yolo/.../weights/best.pt)",
    )
    parser.add_argument(
        "--target-name",
        default="yolov11_camtraffic_v1.pt",
        help="Deployed weights filename under models/",
    )
    parser.add_argument(
        "--report",
        default="runs/integration/model_deployment_report.json",
        help="Integration report JSON path",
    )
    return parser.parse_args()


def resolve(path_arg: str) -> Path:
    path = Path(path_arg)
    return path if path.is_absolute() else SERVICE_ROOT / path


def main() -> None:
    args = parse_args()
    source_weights = resolve(args.yolo_weights)
    models_dir = SERVICE_ROOT / "models"
    target_path = models_dir / args.target_name
    report_path = resolve(args.report)

    if not source_weights.exists():
        raise FileNotFoundError(f"YOLO weights not found: {source_weights}")

    models_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source_weights, target_path)

    registry_path = models_dir / "model_registry.json"
    registry: dict = {}
    if registry_path.exists():
        registry = json.loads(registry_path.read_text(encoding="utf-8"))

    registry["yolo"] = {
        "active_weights": args.target_name,
        "source_weights": str(source_weights.relative_to(SERVICE_ROOT))
        if source_weights.is_relative_to(SERVICE_ROOT)
        else str(source_weights),
        "deployed_at": datetime.now(timezone.utc).isoformat(),
        "env_var": "AI_YOLO_WEIGHTS",
    }
    registry_path.write_text(json.dumps(registry, indent=2), encoding="utf-8")

    report = {
        "task": 148,
        "deployed_weights": str(target_path.relative_to(SERVICE_ROOT)),
        "source_weights": str(source_weights),
        "registry": str(registry_path.relative_to(SERVICE_ROOT)),
        "runtime_env": {
            "AI_YOLO_WEIGHTS": args.target_name,
            "AI_DETECTION_MODE": "yolo",
        },
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"Deployed YOLO weights: {target_path}")
    print(f"Registry updated: {registry_path}")
    print(f"Integration report: {report_path}")


if __name__ == "__main__":
    main()
