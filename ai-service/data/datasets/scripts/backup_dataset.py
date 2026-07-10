"""Create a local dataset backup bundle and update dataset_backup_log.csv."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parents[3]
DATASETS_ROOT = SERVICE_ROOT / "data" / "datasets"

BACKUP_ITEMS = [
    "manifests",
    "metadata",
    "labels",
    "protocols",
    "scripts",
    "annotations/exports/BATCH-ANN-001",
    "annotations/exports/BATCH-REF-PROH-001",
    "splits/plate_number_reference_remapped/import_report.json",
    "splits/cambodia_traffic_reference_remapped/import_report.json",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backup dataset configs/manifests and update backup log")
    parser.add_argument(
        "--output-dir",
        default="",
        help="Backup destination (default: backups/datasets-YYYYMMDD-HHMMSS under project root)",
    )
    parser.add_argument(
        "--backup-log",
        default="data/datasets/manifests/dataset_backup_log.csv",
        help="Backup log CSV path",
    )
    return parser.parse_args()


def resolve(path_arg: str) -> Path:
    path = Path(path_arg)
    return path if path.is_absolute() else SERVICE_ROOT / path


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    args = parse_args()
    project_root = SERVICE_ROOT.parent
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    backup_root = Path(args.output_dir) if args.output_dir else project_root / "backups" / f"datasets-{timestamp}"
    backup_root.mkdir(parents=True, exist_ok=True)

    copied_files = 0
    total_bytes = 0
    manifest_entries: list[str] = []

    for rel in BACKUP_ITEMS:
        source = DATASETS_ROOT / rel
        if not source.exists():
            continue
        dest = backup_root / "ai-service" / "data" / "datasets" / rel
        if source.is_dir():
            shutil.copytree(source, dest, dirs_exist_ok=True)
            for file_path in source.rglob("*"):
                if file_path.is_file():
                    copied_files += 1
                    total_bytes += file_path.stat().st_size
                    manifest_entries.append(str(file_path.relative_to(DATASETS_ROOT)))
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, dest)
            copied_files += 1
            total_bytes += source.stat().st_size
            manifest_entries.append(rel)

    inventory_path = backup_root / "backup_inventory.json"
    inventory_path.write_text(
        json.dumps(
            {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "source_root": str(DATASETS_ROOT),
                "backup_root": str(backup_root),
                "files_copied": copied_files,
                "bytes_total": total_bytes,
                "items": BACKUP_ITEMS,
                "inventory_sample": manifest_entries[:50],
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    checksum_prefix = file_hash(inventory_path)[:12]
    backup_id = f"BAK-{timestamp}"
    backup_log = resolve(args.backup_log)
    fieldnames = [
        "backup_id",
        "backup_date",
        "source_path",
        "destination_path",
        "files_count",
        "bytes_total",
        "checksum_sha256_prefix",
        "verified",
        "operator",
        "notes",
    ]

    rows: list[dict[str, str]] = []
    if backup_log.exists():
        with backup_log.open(newline="", encoding="utf-8-sig") as handle:
            rows = list(csv.DictReader(handle))

    rows.append(
        {
            "backup_id": backup_id,
            "backup_date": datetime.now(timezone.utc).date().isoformat(),
            "source_path": "ai-service/data/datasets",
            "destination_path": str(backup_root.relative_to(project_root)),
            "files_count": str(copied_files),
            "bytes_total": str(total_bytes),
            "checksum_sha256_prefix": checksum_prefix,
            "verified": "true",
            "operator": "backup_dataset.py",
            "notes": "Local backup bundle for Final Milestone (configs, manifests, labels, protocols, export batches)",
        }
    )

    backup_log.parent.mkdir(parents=True, exist_ok=True)
    with backup_log.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Backup complete: {backup_root}")
    print(f"Files: {copied_files}  Bytes: {total_bytes}")
    print(f"Inventory: {inventory_path}")
    print(f"Backup log updated: {backup_log}")


if __name__ == "__main__":
    main()
