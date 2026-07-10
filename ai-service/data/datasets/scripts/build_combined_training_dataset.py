"""Build unified YOLO training dataset from validated reference splits (Task 143)."""

from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[3]
DATASETS_ROOT = SERVICE_ROOT / "data" / "datasets"

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

DEFAULT_SOURCES = [
    {
        "name": "cambodia_traffic_reference_remapped",
        "images": "splits/cambodia_traffic_reference_remapped/{split}/images",
        "labels": "splits/cambodia_traffic_reference_remapped/{split}/labels",
    },
    {
        "name": "plate_number_reference_remapped",
        "images": "splits/plate_number_reference_remapped/{split}/images",
        "labels": "splits/plate_number_reference_remapped/{split}/labels",
    },
    {
        "name": "prohibitory_reference",
        "images": "annotations/exports/BATCH-REF-PROH-001/images",
        "labels": "annotations/exports/BATCH-REF-PROH-001/labels",
        "splits": ["train"],
    },
    {
        "name": "annotation_smoke",
        "images": "annotations/exports/BATCH-ANN-001/images",
        "labels": "annotations/exports/BATCH-ANN-001/labels",
        "splits": ["train"],
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Merge dataset splits into training_combined")
    parser.add_argument(
        "--output-dir",
        default="data/datasets/splits/training_combined",
        help="Combined split output base directory",
    )
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args()


def resolve(path_arg: str) -> Path:
    path = Path(path_arg)
    return path if path.is_absolute() else SERVICE_ROOT / path


def copy_pair(images_in: Path, labels_in: Path, images_out: Path, labels_out: Path, prefix: str) -> int:
    images_out.mkdir(parents=True, exist_ok=True)
    labels_out.mkdir(parents=True, exist_ok=True)
    copied = 0
    for image_path in sorted(images_in.iterdir()):
        if not image_path.is_file() or image_path.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        label_path = labels_in / f"{image_path.stem}.txt"
        if not label_path.exists():
            continue
        target_stem = f"{prefix}_{image_path.stem}"
        shutil.copy2(image_path, images_out / f"{target_stem}{image_path.suffix.lower()}")
        shutil.copy2(label_path, labels_out / f"{target_stem}.txt")
        copied += 1
    return copied


def main() -> None:
    args = parse_args()
    output_dir = resolve(args.output_dir)
    if output_dir.exists():
        if not args.overwrite:
            raise FileExistsError(f"Output exists: {output_dir}. Pass --overwrite.")
        shutil.rmtree(output_dir)

    counts: dict[str, dict[str, int]] = {"train": {}, "val": {}, "test": {}}

    for source in DEFAULT_SOURCES:
        source_splits = source.get("splits", ["train", "val", "test"])
        for split in source_splits:
            images_template = source["images"]
            labels_template = source["labels"]
            if "{split}" in images_template:
                images_in = DATASETS_ROOT / images_template.format(split=split)
                labels_in = DATASETS_ROOT / labels_template.format(split=split)
            else:
                images_in = DATASETS_ROOT / images_template
                labels_in = DATASETS_ROOT / labels_template

            if not images_in.is_dir() or not labels_in.is_dir():
                continue

            copied = copy_pair(
                images_in,
                labels_in,
                output_dir / split / "images",
                output_dir / split / "labels",
                prefix=source["name"][:12],
            )
            counts[split][source["name"]] = copied

    for split in ("train", "val", "test"):
        (output_dir / split / "images").mkdir(parents=True, exist_ok=True)
        (output_dir / split / "labels").mkdir(parents=True, exist_ok=True)

    report = {
        "task": 143,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "output_dir": str(output_dir.relative_to(SERVICE_ROOT)),
        "per_source_counts": counts,
        "totals": {
            split: sum(counts[split].values()) for split in ("train", "val", "test")
        },
    }
    (output_dir / "build_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
