"""Task 170 — Verify YOLO annotation labels after Roboflow export."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify YOLO label files")
    parser.add_argument("--labels-dir", required=True, help="Directory containing .txt label files")
    parser.add_argument("--num-classes", type=int, default=31)
    parser.add_argument("--output", default="runs/evaluation/label_verification_report.json")
    parser.add_argument("--update-yaml", action="store_true", help="Generate dataset.yaml from split")
    parser.add_argument("--dataset-dir", help="Root dataset dir (for --update-yaml)")
    parser.add_argument("--yaml-output", default="training/yolo/dataset_v2.yaml")
    return parser.parse_args()


CLASS_NAMES = [
    "speed_limit_20", "speed_limit_30", "speed_limit_40", "speed_limit_50",
    "speed_limit_60", "no_entry", "stop", "yield", "no_u_turn", "one_way",
    "parking_prohibited", "pedestrian_crossing", "school_zone", "traffic_light_signal",
    "plate_number", "plate_khmer", "plate_foreigner", "unknown_sign",
    "car_sedan", "car_suv", "car_pickup", "car_hatchback",
    "motorcycle_small", "motorcycle_large", "scooter", "taxi",
    "bus", "truck", "van", "government_vehicle", "police_vehicle",
]


def verify_label_file(path: Path, num_classes: int) -> list[str]:
    issues = []
    try:
        lines = path.read_text(encoding="utf-8").strip().splitlines()
        if not lines:
            issues.append("empty_file")
            return issues
        for i, line in enumerate(lines, 1):
            parts = line.strip().split()
            if len(parts) != 5:
                issues.append(f"line_{i}_wrong_columns({len(parts)})")
                continue
            try:
                cls_id = int(parts[0])
                cx, cy, bw, bh = [float(x) for x in parts[1:]]
            except ValueError:
                issues.append(f"line_{i}_non_numeric")
                continue
            if cls_id < 0 or cls_id >= num_classes:
                issues.append(f"line_{i}_invalid_class_id({cls_id})")
            for coord_name, coord in zip(["cx", "cy", "bw", "bh"], [cx, cy, bw, bh]):
                if not (0.0 <= coord <= 1.0):
                    issues.append(f"line_{i}_{coord_name}_out_of_range({coord:.3f})")
    except Exception as exc:
        issues.append(f"read_error: {exc}")
    return issues


def main() -> None:
    args = parse_args()
    labels_dir = Path(args.labels_dir)

    if not labels_dir.exists():
        print(f"Labels directory not found: {labels_dir}")
        return

    label_files = sorted(labels_dir.glob("*.txt"))
    print(f"Found {len(label_files)} label files in {labels_dir}")

    class_counts: dict[int, int] = {i: 0 for i in range(args.num_classes)}
    failed_files: list[dict] = []
    empty_files: list[str] = []
    total_boxes = 0

    for lf in label_files:
        issues = verify_label_file(lf, args.num_classes)
        if "empty_file" in issues:
            empty_files.append(lf.name)
        elif issues:
            failed_files.append({"file": lf.name, "issues": issues})
        else:
            for line in lf.read_text(encoding="utf-8").strip().splitlines():
                parts = line.strip().split()
                if parts:
                    cls_id = int(parts[0])
                    class_counts[cls_id] = class_counts.get(cls_id, 0) + 1
                    total_boxes += 1

    print(f"\nTotal bounding boxes: {total_boxes}")
    print(f"Empty files: {len(empty_files)}")
    print(f"Files with issues: {len(failed_files)}")
    print(f"\nClass distribution:")
    print(f"  {'ID':<4} {'Class':<30} {'Boxes':>8} {'Status':>10}")
    print("  " + "-" * 58)
    for i, name in enumerate(CLASS_NAMES[:args.num_classes]):
        count = class_counts.get(i, 0)
        status = "✓ OK" if count >= 50 else ("⚠ LOW" if count > 0 else "✗ NONE")
        print(f"  {i:<4} {name:<30} {count:>8}  {status}")

    missing = [CLASS_NAMES[i] for i in range(args.num_classes) if class_counts.get(i, 0) < 50]
    if missing:
        print(f"\n⚠ Classes with < 50 annotations (need more data):")
        for m in missing:
            print(f"  - {m}")

    report = {
        "task": 170,
        "labels_dir": str(labels_dir),
        "total_label_files": len(label_files),
        "total_boxes": total_boxes,
        "empty_files": len(empty_files),
        "files_with_issues": len(failed_files),
        "class_distribution": {CLASS_NAMES[i]: class_counts.get(i, 0) for i in range(args.num_classes)},
        "classes_below_50": missing,
        "failures": failed_files[:20],
    }
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\nReport saved: {out}")

    if args.update_yaml and args.dataset_dir:
        dataset_dir = Path(args.dataset_dir)
        yaml_out = Path(args.yaml_output)
        yaml_out.parent.mkdir(parents=True, exist_ok=True)
        names_block = "\n".join(f"  {i}: {n}" for i, n in enumerate(CLASS_NAMES[:args.num_classes]))
        yaml_content = f"""# CamTraffic v2 — Generated by verify_labels.py
path: {dataset_dir.resolve().as_posix()}
train: train/images
val: val/images
test: test/images

nc: {args.num_classes}
names:
{names_block}
"""
        yaml_out.write_text(yaml_content, encoding="utf-8")
        print(f"dataset.yaml written: {yaml_out}")


if __name__ == "__main__":
    main()
