"""Task 141 — Build OCR dataset from YOLO splits.

Creates `ocr_manifest.csv` and exports plate crops by calling `prepare_crops.py`
for each split (train/val/test).
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parents[2]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build OCR dataset from YOLO splits")
    parser.add_argument("--splits-base", default="data/datasets/splits", help="Splits base directory")
    parser.add_argument(
        "--output-manifest",
        default="data/datasets/manifests/ocr_manifest.csv",
        help="Runtime OCR manifest CSV path",
    )
    parser.add_argument(
        "--output-crops-dir",
        default="data/datasets/processed/ocr/crops",
        help="Directory for exported plate crops",
    )
    parser.add_argument(
        "--splits",
        default="train,val,test",
        help="Comma-separated splits to process",
    )
    parser.add_argument("--padding", type=float, default=0.05, help="BBox padding ratio")
    parser.add_argument("--class-ids", default="14,15,16", help="Plate class IDs")
    parser.add_argument("--reset-manifest", action="store_true", help="Overwrite existing manifest")
    return parser.parse_args()


def resolve(path_arg: str) -> Path:
    path = Path(path_arg)
    return path if path.is_absolute() else SERVICE_ROOT / path


def main() -> None:
    args = parse_args()
    splits_base = resolve(args.splits_base)
    manifest_path = resolve(args.output_manifest)
    crops_dir = resolve(args.output_crops_dir)
    splits = [s.strip() for s in args.splits.split(",") if s.strip()]

    if args.reset_manifest and manifest_path.exists():
        manifest_path.unlink()

    crops_dir.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)

    for split in splits:
        images_dir = splits_base / split / "images"
        labels_dir = splits_base / split / "labels"

        if not images_dir.is_dir():
            print(f"[{split}] images dir missing: {images_dir} (skipping)")
            continue
        if not labels_dir.is_dir():
            print(f"[{split}] labels dir missing: {labels_dir} (skipping)")
            continue

        cmd = [
            sys.executable,
            "training/ocr/prepare_crops.py",
            "--images-dir",
            str(images_dir.relative_to(SERVICE_ROOT)),
            "--labels-dir",
            str(labels_dir.relative_to(SERVICE_ROOT)),
            "--output-dir",
            str(crops_dir.relative_to(SERVICE_ROOT)),
            "--manifest",
            str(manifest_path.relative_to(SERVICE_ROOT)),
            "--split",
            split,
            "--padding",
            str(args.padding),
            "--class-ids",
            args.class_ids,
        ]
        print(f"[{split}] running: {' '.join(cmd)}")
        subprocess.run(cmd, cwd=SERVICE_ROOT, check=True)

    print("OCR dataset build complete.")
    print(f"Manifest: {manifest_path}")
    print(f"Crops dir: {crops_dir}")


if __name__ == "__main__":
    main()

