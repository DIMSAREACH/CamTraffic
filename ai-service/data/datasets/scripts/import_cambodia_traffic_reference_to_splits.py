"""Import Roboflow Cambodia Traffic vehicle dataset into CamTraffic YOLO splits.

Source classes (Roboflow): Bus, Car, Moto, Truck, Tuk Tuk
Target classes use CamTraffic vehicle taxonomy ids (18-27).
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
    r"d:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Cambodia Traffic.v1i.yolov11"
)
DEFAULT_OUTPUT_SPLITS_DIR = "data/datasets/splits/cambodia_traffic_reference_remapped"

# Roboflow class id -> CamTraffic YOLO class id
CLASS_MAP: dict[int, int] = {
    0: 26,  # Bus -> bus
    1: 18,  # Car -> car_sedan
    2: 22,  # Moto -> motorcycle_small
    3: 27,  # Truck -> truck
    4: 23,  # Tuk Tuk -> motorcycle_large
}

SUPPORTED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


@dataclass(frozen=True)
class SplitSpec:
    source_name: str
    target_name: str


SPLITS: list[SplitSpec] = [
    SplitSpec(source_name="train", target_name="train"),
    SplitSpec(source_name="valid", target_name="val"),
    SplitSpec(source_name="test", target_name="test"),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import Cambodia Traffic vehicle reference into YOLO splits")
    parser.add_argument("--source-dir", default=str(DEFAULT_SOURCE_DIR))
    parser.add_argument("--output-splits-dir", default=DEFAULT_OUTPUT_SPLITS_DIR)
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def resolve_path(path_arg: str) -> Path:
    p = Path(path_arg)
    return p if p.is_absolute() else SERVICE_ROOT / p


def iter_files(folder: Path, suffixes: set[str]) -> list[Path]:
    if not folder.exists():
        return []
    return sorted([p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in suffixes])


def remap_label_file(label_path: Path) -> tuple[str, Counter[int]]:
    out_lines: list[str] = []
    remap_counts: Counter[int] = Counter()
    for raw in label_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) != 5:
            continue
        source_id = int(parts[0])
        target_id = CLASS_MAP.get(source_id)
        if target_id is None:
            continue
        remap_counts[source_id] += 1
        out_lines.append(f"{target_id} {parts[1]} {parts[2]} {parts[3]} {parts[4]}")
    return "\n".join(out_lines) + ("\n" if out_lines else ""), remap_counts


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
            raise FileExistsError(f"Output exists: {output_splits_dir}. Pass --overwrite.")
        if not args.dry_run:
            shutil.rmtree(output_splits_dir)

    for split in ("train", "val", "test"):
        if not args.dry_run:
            ensure_dirs(output_splits_dir, split)

    per_split_counts: dict[str, dict[str, int]] = {}
    class_remap_counts: Counter[int] = Counter()

    for split in SPLITS:
        source_split_dir = source_dir / split.source_name
        if not source_split_dir.exists():
            per_split_counts[split.target_name] = {"images_copied": 0, "labels_copied": 0}
            continue

        images = iter_files(source_split_dir / "images", SUPPORTED_IMAGE_SUFFIXES)
        labels = iter_files(source_split_dir / "labels", {".txt"})
        images_out, labels_out = ensure_dirs(output_splits_dir, split.target_name)

        if args.dry_run:
            print(f"[dry-run] {split.source_name} -> {split.target_name}: images={len(images)} labels={len(labels)}")
            continue

        for img in images:
            shutil.copy2(img, images_out / img.name)

        for label in labels:
            remapped, counts = remap_label_file(label)
            class_remap_counts.update(counts)
            (labels_out / label.name).write_text(remapped, encoding="utf-8")

        per_split_counts[split.target_name] = {"images_copied": len(images), "labels_copied": len(labels)}

    report = {
        "task": "import_cambodia_traffic_reference_to_splits",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_dir": str(source_dir),
        "output_splits_dir": str(output_splits_dir),
        "class_map": {str(k): v for k, v in CLASS_MAP.items()},
        "per_split_counts": per_split_counts,
        "source_class_line_count": dict(class_remap_counts),
    }

    if not args.dry_run:
        (output_splits_dir / "import_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("Import complete.")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
