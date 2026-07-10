"""Task 133 — Evaluate YOLO detection and OCR recognition models."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate CamTraffic AI models")
    parser.add_argument("--yolo-weights", required=True, help="YOLO weights path")
    parser.add_argument("--yolo-data", required=True, help="YOLO dataset yaml path")
    parser.add_argument("--ocr-manifest", required=True, help="OCR manifest CSV path")
    parser.add_argument("--ocr-split", default="val", choices=["train", "val", "test"])
    parser.add_argument(
        "--output",
        default="runs/evaluation/model_eval_summary.json",
        help="Output evaluation summary JSON path",
    )
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--device", default="")
    return parser.parse_args()


def resolve(path_arg: str) -> Path:
    path = Path(path_arg)
    return path if path.is_absolute() else SERVICE_ROOT / path


def run_yolo_eval(weights: Path, data: Path, imgsz: int, batch: int, device: str) -> dict[str, float]:
    from ultralytics import YOLO

    model = YOLO(str(weights))
    metrics = model.val(
        data=str(data),
        imgsz=imgsz,
        batch=batch,
        device=device or None,
        split="val",
    )

    return {
        "map50": float(getattr(metrics.box, "map50", 0.0)),
        "map50_95": float(getattr(metrics.box, "map", 0.0)),
        "precision": float(getattr(metrics.box, "mp", 0.0)),
        "recall": float(getattr(metrics.box, "mr", 0.0)),
    }


def run_ocr_eval(manifest: Path, split: str) -> dict[str, float]:
    output = SERVICE_ROOT / "runs" / "ocr" / "evaluation" / f"report_{split}.json"
    cmd = [
        sys.executable,
        "training/ocr/evaluate.py",
        "--manifest",
        str(manifest),
        "--split",
        split,
        "--output",
        str(output),
    ]
    subprocess.run(cmd, cwd=SERVICE_ROOT, check=True)
    return json.loads(output.read_text(encoding="utf-8"))


def main() -> None:
    args = parse_args()
    yolo_weights = resolve(args.yolo_weights)
    yolo_data = resolve(args.yolo_data)
    ocr_manifest = resolve(args.ocr_manifest)
    output_path = resolve(args.output)

    if not yolo_weights.exists():
        raise FileNotFoundError(f"YOLO weights not found: {yolo_weights}")
    if not yolo_data.exists():
        raise FileNotFoundError(f"YOLO data config not found: {yolo_data}")
    if not ocr_manifest.exists():
        raise FileNotFoundError(f"OCR manifest not found: {ocr_manifest}")

    detection = run_yolo_eval(yolo_weights, yolo_data, args.imgsz, args.batch, args.device)
    ocr = run_ocr_eval(ocr_manifest, args.ocr_split)

    summary = {
        "task": 133,
        "detection": detection,
        "ocr": {
            "split": ocr["split"],
            "samples": ocr["samples"],
            "mean_cer": ocr["mean_cer"],
            "exact_match_rate": ocr["exact_match_rate"],
        },
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Evaluation summary saved: {output_path}")


if __name__ == "__main__":
    main()
