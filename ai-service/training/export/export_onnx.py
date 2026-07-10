"""Task 135 — Export YOLO model weights to ONNX."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from ultralytics import YOLO

SERVICE_ROOT = Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export YOLO weights to ONNX")
    parser.add_argument("--weights", required=True, help="Path to YOLO .pt weights")
    parser.add_argument("--output-dir", default="models/exports", help="Output directory")
    parser.add_argument("--imgsz", type=int, default=640, help="Export image size")
    parser.add_argument("--opset", type=int, default=12, help="ONNX opset")
    parser.add_argument("--dynamic", action="store_true", help="Enable dynamic input shape")
    parser.add_argument("--half", action="store_true", help="Enable FP16 export where supported")
    parser.add_argument(
        "--report",
        default="runs/export/onnx_export_report.json",
        help="Export report JSON path",
    )
    return parser.parse_args()


def resolve(path_arg: str) -> Path:
    path = Path(path_arg)
    return path if path.is_absolute() else SERVICE_ROOT / path


def main() -> None:
    args = parse_args()
    weights = resolve(args.weights)
    output_dir = resolve(args.output_dir)
    report_path = resolve(args.report)

    if not weights.exists():
        raise FileNotFoundError(f"Weights not found: {weights}")

    output_dir.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    model = YOLO(str(weights))
    exported_path = model.export(
        format="onnx",
        imgsz=args.imgsz,
        opset=args.opset,
        dynamic=args.dynamic,
        half=args.half,
    )

    exported = Path(str(exported_path))
    if not exported.is_absolute():
        exported = (Path.cwd() / exported).resolve()

    target = output_dir / exported.name
    if exported != target:
        target.write_bytes(exported.read_bytes())

    report = {
        "task": 135,
        "source_weights": str(weights),
        "onnx_model": str(target),
        "imgsz": args.imgsz,
        "opset": args.opset,
        "dynamic": args.dynamic,
        "half": args.half,
    }
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"ONNX exported to: {target}")
    print(f"Export report: {report_path}")


if __name__ == "__main__":
    main()
