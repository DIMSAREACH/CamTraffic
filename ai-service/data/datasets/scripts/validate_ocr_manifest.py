"""Task 141 — Validate OCR manifest CSV schema and crop references."""

from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parents[3]

REQUIRED_FIELDS = [
    "sample_id",
    "crop_path",
    "transcription",
    "plate_type",
    "split",
    "source_image",
    "notes",
]

PLATE_TYPES = {
    "license_plate_kh_private",
    "license_plate_kh_commercial",
    "license_plate_kh_government",
}
SPLITS = {"train", "val", "test"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate OCR manifest CSV")
    parser.add_argument("--manifest", default="data/datasets/manifests/ocr_manifest.csv")
    parser.add_argument("--require-transcription", action="store_true")
    parser.add_argument("--validate-crops-exist", action="store_true")
    return parser.parse_args()


def resolve(path_arg: str) -> Path:
    path = Path(path_arg)
    return path if path.is_absolute() else SERVICE_ROOT / path


def main() -> None:
    args = parse_args()
    manifest_path = resolve(args.manifest)

    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    issues: list[str] = []
    with manifest_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames or []

        missing_columns = [f for f in REQUIRED_FIELDS if f not in fieldnames]
        if missing_columns:
            raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")

        for i, row in enumerate(reader, start=2):
            for field in REQUIRED_FIELDS:
                if not (row.get(field) or "").strip():
                    # `transcription` is allowed to be empty initially (manual step)
                    if field == "transcription" and not args.require_transcription:
                        continue
                    issues.append(f"Row {i}: empty `{field}`")

            plate_type = (row.get("plate_type") or "").strip()
            if plate_type and plate_type not in PLATE_TYPES:
                issues.append(f"Row {i}: invalid plate_type `{plate_type}`")

            split = (row.get("split") or "").strip()
            if split and split not in SPLITS:
                issues.append(f"Row {i}: invalid split `{split}`")

            if args.validate_crops_exist:
                crop_path = (row.get("crop_path") or "").strip()
                if crop_path:
                    crop_file = Path(crop_path)
                    if not crop_file.is_absolute():
                        crop_file = SERVICE_ROOT / crop_file
                    if not crop_file.exists():
                        issues.append(f"Row {i}: crop file missing `{crop_path}`")

    if issues:
        print("OCR manifest validation FAILED:")
        for issue in issues:
            print(f"- {issue}")
        raise SystemExit(1)

    print(f"OCR manifest validation PASSED: {manifest_path}")


if __name__ == "__main__":
    main()

