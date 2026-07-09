"""Task 175–176 — Generate confusion matrix and per-class metrics for YOLO model."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate YOLO confusion matrix and per-class metrics")
    parser.add_argument("--weights", required=True, help="Path to YOLO .pt weights")
    parser.add_argument("--data", required=True, help="YOLO dataset YAML")
    parser.add_argument("--split", default="val", choices=["train", "val", "test"])
    parser.add_argument("--conf", type=float, default=0.25)
    parser.add_argument("--output-dir", default="runs/evaluation/confusion_matrix")
    parser.add_argument("--report", default="runs/evaluation/per_class_metrics.json")
    return parser.parse_args()


def resolve(path_arg: str) -> Path:
    p = Path(path_arg)
    return p if p.is_absolute() else SERVICE_ROOT / p


CLASS_NAMES = [
    "speed_limit_20", "speed_limit_30", "speed_limit_40", "speed_limit_50",
    "speed_limit_60", "no_entry", "stop", "yield", "no_u_turn", "one_way",
    "parking_prohibited", "pedestrian_crossing", "school_zone", "traffic_light_signal",
    "plate_number", "plate_khmer", "plate_foreigner", "unknown_sign",
    "car_sedan", "car_suv", "car_pickup", "car_hatchback",
    "motorcycle_small", "motorcycle_large", "scooter", "taxi",
    "bus", "truck", "van", "government_vehicle", "police_vehicle",
]


def main() -> None:
    args = parse_args()
    weights = resolve(args.weights)
    data_yaml = resolve(args.data)
    output_dir = resolve(args.output_dir)
    report_path = resolve(args.report)

    output_dir.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    from ultralytics import YOLO
    model = YOLO(str(weights))

    print(f"Running validation on split='{args.split}' ...")
    metrics = model.val(
        data=str(data_yaml),
        split=args.split,
        conf=args.conf,
        verbose=False,
        plots=True,
        project=str(output_dir),
        name="results",
    )

    # Overall metrics
    overall = {
        "map50":    float(metrics.box.map50),
        "map50_95": float(metrics.box.map),
        "precision": float(metrics.box.mp),
        "recall":    float(metrics.box.mr),
    }

    # Per-class metrics — ultralytics only returns entries for classes present in val set
    per_class: list[dict] = []
    maps  = list(metrics.box.maps)   # mAP@50-95 per present class
    ap50  = list(metrics.box.ap50)   # AP@50 per present class
    p_arr = list(metrics.box.p)      # precision per present class
    r_arr = list(metrics.box.r)      # recall per present class

    # Map present class indices to CLASS_NAMES
    present_names = metrics.names  # dict {id: name} from the YAML
    for idx, (cls_id, cls_name) in enumerate(sorted(present_names.items())):
        if idx >= len(maps):
            break
        p = float(p_arr[idx]) if idx < len(p_arr) else 0.0
        r = float(r_arr[idx]) if idx < len(r_arr) else 0.0
        per_class.append({
            "class_id": cls_id,
            "class_name": cls_name,
            "ap50":      round(float(ap50[idx]), 4) if idx < len(ap50) else 0.0,
            "map50_95":  round(float(maps[idx]), 4) if idx < len(maps) else 0.0,
            "precision": round(p, 4),
            "recall":    round(r, 4),
            "f1":        round(2 * p * r / max(p + r, 1e-9), 4),
        })

    report = {
        "task": 175,
        "weights": str(weights),
        "split": args.split,
        "conf_threshold": args.conf,
        "overall": overall,
        "per_class": per_class,
        "confusion_matrix_plot": str(output_dir / "results" / "confusion_matrix.png"),
        "notes": "Confusion matrix PNG saved in output_dir/results/ by ultralytics.",
    }
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"\n=== Overall Metrics ===")
    print(f"  mAP@50:     {overall['map50']:.4f}")
    print(f"  mAP@50-95:  {overall['map50_95']:.4f}")
    print(f"  Precision:  {overall['precision']:.4f}")
    print(f"  Recall:     {overall['recall']:.4f}")

    print(f"\n=== Per-Class AP@50 ===")
    print(f"  {'ID':<4} {'Class':<30} {'AP@50':>8} {'P':>8} {'R':>8} {'F1':>8}")
    print("  " + "-" * 68)
    for pc in per_class:
        print(f"  {pc['class_id']:<4} {pc['class_name']:<30} {pc['ap50']:>8.4f} {pc['precision']:>8.4f} {pc['recall']:>8.4f} {pc['f1']:>8.4f}")

    print(f"\nPer-class report: {report_path}")
    print(f"Confusion matrix: {output_dir}/results/confusion_matrix.png")


if __name__ == "__main__":
    main()
