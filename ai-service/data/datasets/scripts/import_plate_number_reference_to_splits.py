"""Import Roboflow plate-number reference dataset into CamTraffic YOLO splits.

This reference dataset contains plate boxes but only a single class (class id `0`).
Your CamTraffic OCR pipeline expects license-plate boxes with YOLO class ids:
`14, 15, 16` (private/commercial/government).

This script remaps the reference class `0` into a single target class id
(default: `14` = `license_plate_kh_private`), copies images + remaps labels
into a new splits directory, and writes a small JSON summary report.
"""

from __future__ import annotations

import argparse
import json
import shutil
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SOURCE_DIR = Path(
    r"d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Plate Number.v3i.yolov11"
)

DEFAULT_OUTPUT_SPLITS_DIR = "data/datasets/splits/plate_number_reference_remapped"

SUPPORTED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


@dataclass(frozen=True)
class SplitSpec:
    source_name: str  # folder name in the reference export: train/valid/test
    target_name: str  # folder name we use in CamTraffic splits: train/val/test


SPLITS: list[SplitSpec] = [
    SplitSpec(source_name="train", target_name="train"),
    SplitSpec(source_name="valid", target_name="val"),
    SplitSpec(source_name="test", target_name="test"),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import plate reference dataset into remapped YOLO splits")
    parser.add_argument("--source-dir", default=str(DEFAULT_SOURCE_DIR), help="Path to Roboflow plate dataset")
    parser.add_argument(
        "--output-splits-dir",
        default=DEFAULT_OUTPUT_SPLITS_DIR,
        help="Output split base directory (relative to ai-service by default)",
    )
    parser.add_argument(
        "--target-plate-class-id",
        type=int,
        default=14,
        help="Target YOLO class id for license plates (14 private, 15 commercial, 16 government)",
    )
    parser.add_argument(
        "--source-class-id",
        type=int,
        default=0,
        help="Reference YOLO class id to remap (reference export uses a single class, usually 0)",
    )
    parser.add_argument("--overwrite", action="store_true", help="Overwrite output directories if they exist")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without copying/writing")
    return parser.parse_args()


def resolve_path(path_arg: str) -> Path:
    p = Path(path_arg)
    return p if p.is_absolute() else SERVICE_ROOT / p


def iter_files(folder: Path, suffixes: set[str]) -> list[Path]:
    if not folder.exists():
        return []
    return sorted([p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in suffixes])


def read_and_remap_label_lines(label_path: Path, *, source_class_id: int, target_class_id: int) -> str:
    out_lines: list[str] = []
    for raw in label_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) != 5:
            # Keep dataset robust: skip malformed lines.
            continue
        class_id = int(parts[0])
        if class_id == source_class_id:
            class_id = target_class_id
        out_lines.append(f"{class_id} {parts[1]} {parts[2]} {parts[3]} {parts[4]}")
    return "\n".join(out_lines) + ("\n" if out_lines else "")


def ensure_dirs(base: Path, split_name: str) -> tuple[Path, Path]:
    images_dir = base / split_name / "images"
    labels_dir = base / split_name / "labels"
    images_dir.mkdir(parents=True, exist_ok=True)
    labels_dir.mkdir(parents=True, exist_ok=True)
    return images_dir, labels_dir


def main() -> None:
    args = parse_args()
    source_dir = Path(args.source_dir)
    if not source_dir.is_dir():
        raise FileNotFoundError(f"Source directory not found: {source_dir}")

    output_splits_dir = resolve_path(args.output_splits_dir)
    if output_splits_dir.exists():
        if not args.overwrite:
            raise FileExistsError(
                f"Output directory exists: {output_splits_dir}. "
                f"Pass --overwrite to replace it."
            )
        if not args.dry_run:
            shutil.rmtree(output_splits_dir)

    # Always create target split structure (even if a split is missing upstream).
    for split in ["train", "val", "test"]:
        if args.dry_run:
            continue
        ensure_dirs(output_splits_dir, split)

    class_remap_counts: Counter[int] = Counter()
    per_split_counts: dict[str, dict[str, int]] = {}

    for split in SPLITS:
        source_split_dir = source_dir / split.source_name
        if not source_split_dir.exists():
            per_split_counts[split.target_name] = {"images_copied": 0, "labels_copied": 0}
            continue

        source_images_dir = source_split_dir / "images"
        source_labels_dir = source_split_dir / "labels"

        images_out_dir, labels_out_dir = ensure_dirs(output_splits_dir, split.target_name)

        images = iter_files(source_images_dir, SUPPORTED_IMAGE_SUFFIXES)
        labels = iter_files(source_labels_dir, {".txt"})

        if args.dry_run:
            print(
                f"[dry-run] {split.source_name} -> {split.target_name}: "
                f"images={len(images)} labels={len(labels)}"
            )
            continue

        # Copy images by filename.
        for img in images:
            dest = images_out_dir / img.name
            shutil.copy2(img, dest)

        # Copy + remap labels.
        for label in labels:
            if label.suffix.lower() != ".txt":
                continue
            remapped = read_and_remap_label_lines(
                label,
                source_class_id=args.source_class_id,
                target_class_id=args.target_plate_class_id,
            )
            dest = labels_out_dir / label.name
            dest.write_text(remapped, encoding="utf-8")

        per_split_counts[split.target_name] = {"images_copied": len(images), "labels_copied": len(labels)}

        # Count how many lines had the source class (informational).
        for label in labels:
            for raw in label.read_text(encoding="utf-8").splitlines():
                if not raw.strip():
                    continue
                parts = raw.split()
                if len(parts) != 5:
                    continue
                if int(parts[0]) == args.source_class_id:
                    class_remap_counts[args.source_class_id] += 1

    report = {
        "task": "import_plate_number_reference_to_splits",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_dir": str(source_dir),
        "output_splits_dir": str(output_splits_dir),
        "splits": {s.source_name: s.target_name for s in SPLITS},
        "source_class_id": args.source_class_id,
        "target_plate_class_id": args.target_plate_class_id,
        "per_split_counts": per_split_counts,
        "source_class_line_count": dict(class_remap_counts),
    }

    report_path = output_splits_dir / "import_report.json"
    if not args.dry_run:
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("Import complete.")
    print(json.dumps(report, indent=2))
    if args.dry_run:
        print("Dry run: no files were written.")


if __name__ == "__main__":
    main()

