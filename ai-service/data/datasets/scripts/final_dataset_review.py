"""Task 142 — Final dataset review (structure, size, validation, OCR, backup)."""

from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parents[3]
DATASETS_ROOT = SERVICE_ROOT / "data" / "datasets"

REQUIRED_DIRS = [
    "raw/traffic-signs",
    "raw/vehicles",
    "raw/license-plates",
    "raw/videos",
    "raw/dashcam",
    "processed",
    "splits",
    "annotations/exports",
    "metadata",
    "manifests",
    "labels/yolo",
    "labels/cvat",
    "labels/ocr",
    "labels/qa",
    "protocols",
    "scripts",
]

YOLO_REVIEW_TARGETS = [
    {
        "name": "BATCH-ANN-001",
        "images_dir": "data/datasets/annotations/exports/BATCH-ANN-001/images",
        "labels_dir": "data/datasets/annotations/exports/BATCH-ANN-001/labels",
    },
    {
        "name": "BATCH-REF-PROH-001",
        "images_dir": "data/datasets/annotations/exports/BATCH-REF-PROH-001/images",
        "labels_dir": "data/datasets/annotations/exports/BATCH-REF-PROH-001/labels",
    },
    {
        "name": "plate_number_reference_remapped/train",
        "images_dir": "data/datasets/splits/plate_number_reference_remapped/train/images",
        "labels_dir": "data/datasets/splits/plate_number_reference_remapped/train/labels",
    },
    {
        "name": "plate_number_reference_remapped/val",
        "images_dir": "data/datasets/splits/plate_number_reference_remapped/val/images",
        "labels_dir": "data/datasets/splits/plate_number_reference_remapped/val/labels",
    },
]

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run final dataset review (Task 142)")
    parser.add_argument(
        "--report",
        default="data/datasets/manifests/final_dataset_review_report.json",
        help="Output JSON report path (relative to ai-service by default)",
    )
    return parser.parse_args()


def resolve(path_arg: str) -> Path:
    path = Path(path_arg)
    return path if path.is_absolute() else SERVICE_ROOT / path


def count_files(path: Path) -> int:
    if not path.exists():
        return 0
    return sum(1 for item in path.rglob("*") if item.is_file())


def count_images(path: Path) -> int:
    if not path.exists():
        return 0
    return sum(1 for item in path.iterdir() if item.is_file() and item.suffix.lower() in IMAGE_SUFFIXES)


def run_validate_dataset(images_dir: Path, labels_dir: Path, report_path: Path) -> dict:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        sys.executable,
        str(DATASETS_ROOT / "scripts" / "validate_dataset.py"),
        "--images-dir",
        str(images_dir.relative_to(SERVICE_ROOT)),
        "--labels-dir",
        str(labels_dir.relative_to(SERVICE_ROOT)),
        "--report",
        str(report_path.relative_to(SERVICE_ROOT)),
    ]
    subprocess.run(cmd, cwd=SERVICE_ROOT, check=True)
    return json.loads(report_path.read_text(encoding="utf-8"))


def run_validate_ocr_manifest(manifest_path: Path) -> bool:
    cmd = [
        sys.executable,
        str(DATASETS_ROOT / "scripts" / "validate_ocr_manifest.py"),
        "--manifest",
        str(manifest_path.relative_to(SERVICE_ROOT)),
        "--require-transcription",
        "--validate-crops-exist",
    ]
    result = subprocess.run(cmd, cwd=SERVICE_ROOT, capture_output=True, text=True)
    return result.returncode == 0


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    args = parse_args()
    report_path = resolve(args.report)

    warnings: list[str] = []
    blockers: list[str] = []

    # 1) Folder structure
    folder_structure: dict[str, bool] = {}
    for rel in REQUIRED_DIRS:
        exists = (DATASETS_ROOT / rel).is_dir()
        folder_structure[rel] = exists
        if not exists:
            blockers.append(f"Missing required directory: data/datasets/{rel}")

    # 2) Dataset size
    size_counts = {
        "raw_traffic_signs": count_files(DATASETS_ROOT / "raw/traffic-signs"),
        "raw_vehicles": count_files(DATASETS_ROOT / "raw/vehicles"),
        "raw_license_plates": count_files(DATASETS_ROOT / "raw/license-plates"),
        "raw_dashcam": count_files(DATASETS_ROOT / "raw/dashcam"),
        "processed_total": count_files(DATASETS_ROOT / "processed"),
        "ocr_crops_plate_reference": count_files(DATASETS_ROOT / "processed/ocr/crops_plate_number_reference"),
        "splits_total": count_files(DATASETS_ROOT / "splits"),
        "annotations_exports_total": count_files(DATASETS_ROOT / "annotations/exports"),
        "manifests_total": count_files(DATASETS_ROOT / "manifests"),
        "metadata_total": count_files(DATASETS_ROOT / "metadata"),
    }

    split_counts = {}
    for split in ("train", "val", "test"):
        split_counts[split] = {
            "images": count_images(DATASETS_ROOT / "splits" / split / "images"),
            "labels": count_files(DATASETS_ROOT / "splits" / split / "labels"),
        }
    split_counts["plate_number_reference_remapped"] = {}
    for split in ("train", "val", "test"):
        split_counts["plate_number_reference_remapped"][split] = {
            "images": count_images(
                DATASETS_ROOT / "splits/plate_number_reference_remapped" / split / "images"
            ),
            "labels": count_files(
                DATASETS_ROOT / "splits/plate_number_reference_remapped" / split / "labels"
            ),
        }

    # 3) Annotation quality
    annotation_reviews: list[dict] = []
    for target in YOLO_REVIEW_TARGETS:
        images_dir = resolve(target["images_dir"])
        labels_dir = resolve(target["labels_dir"])
        if not images_dir.is_dir() or not labels_dir.is_dir():
            warnings.append(f"Skipped YOLO review (missing dir): {target['name']}")
            continue
        if count_images(images_dir) == 0:
            warnings.append(f"Skipped YOLO review (no images): {target['name']}")
            continue

        review_report = resolve(
            f"data/datasets/manifests/final_review_{target['name'].replace('/', '_')}.json"
        )
        try:
            result = run_validate_dataset(images_dir, labels_dir, review_report)
            annotation_reviews.append(
                {
                    "name": target["name"],
                    "status": result.get("status", "unknown"),
                    "summary": result.get("summary", {}),
                    "report": str(review_report.relative_to(SERVICE_ROOT)),
                }
            )
            if result.get("status") != "passed":
                blockers.append(f"YOLO validation failed: {target['name']}")
        except subprocess.CalledProcessError as exc:
            blockers.append(f"YOLO validation command failed: {target['name']} ({exc})")

    # 4) OCR quality
    ocr_manifest = DATASETS_ROOT / "manifests/ocr_manifest.csv"
    ocr_rows = read_csv_rows(ocr_manifest)
    ocr_empty_transcriptions = sum(1 for row in ocr_rows if not (row.get("transcription") or "").strip())
    ocr_manifest_valid = run_validate_ocr_manifest(ocr_manifest) if ocr_manifest.exists() else False
    if not ocr_manifest.exists():
        blockers.append("Missing OCR manifest: data/datasets/manifests/ocr_manifest.csv")
    elif not ocr_manifest_valid:
        blockers.append("OCR manifest validation failed")

    ocr_export_root = SERVICE_ROOT / "runs/ocr/dataset"
    ocr_export_counts = {
        "train": count_images(ocr_export_root / "train/images"),
        "val": count_images(ocr_export_root / "val/images"),
        "test": count_images(ocr_export_root / "test/images"),
    }
    if ocr_export_counts["train"] == 0 or ocr_export_counts["val"] == 0:
        warnings.append("OCR export layout missing train/val images (run training/ocr/train.py --export-only)")

    # 5) Metadata
    metadata_runtime = DATASETS_ROOT / "metadata/metadata.csv"
    metadata_rows = read_csv_rows(metadata_runtime)
    metadata_valid = False
    if metadata_runtime.exists() and metadata_rows:
        result = subprocess.run(
            [
                sys.executable,
                str(DATASETS_ROOT / "scripts" / "validate_metadata.py"),
                "--file",
                str(metadata_runtime.relative_to(SERVICE_ROOT)),
            ],
            cwd=SERVICE_ROOT,
            capture_output=True,
            text=True,
        )
        metadata_valid = result.returncode == 0
        if not metadata_valid:
            blockers.append("Metadata validation failed for metadata/metadata.csv")
    metadata_status = {
        "runtime_file_exists": metadata_runtime.exists(),
        "runtime_rows": len(metadata_rows),
        "template_exists": (DATASETS_ROOT / "manifests/metadata.template.csv").exists(),
        "validation_passed": metadata_valid,
    }
    if not metadata_runtime.exists():
        warnings.append("Runtime metadata file not created yet (metadata/metadata.csv)")

    # 6) Backup
    backup_log = DATASETS_ROOT / "manifests/dataset_backup_log.csv"
    backup_template = DATASETS_ROOT / "manifests/dataset_backup_log.template.csv"
    backup_rows = read_csv_rows(backup_log)
    backup_status = {
        "template_exists": backup_template.exists(),
        "runtime_log_exists": backup_log.exists(),
        "runtime_rows": len(backup_rows),
        "verified_backups": sum(1 for row in backup_rows if (row.get("verified") or "").strip().lower() == "true"),
    }
    if not backup_rows:
        warnings.append("No backup log entries yet (copy dataset to external drive and record in dataset_backup_log.csv)")

    # Milestone readiness (honest assessment)
    milestone = {
        "traffic_sign_reference_bootstrap": size_counts["raw_traffic_signs"] > 1,
        "vehicle_dataset_collected": size_counts["raw_vehicles"] > 1,
        "license_plate_ocr_dataset_ready": ocr_manifest_valid and len(ocr_rows) > 0,
        "dashcam_collected": size_counts["raw_dashcam"] > 1,
        "yolo_exports_present": size_counts["annotations_exports_total"] > 10,
        "ocr_dataset_exported": ocr_export_counts["train"] > 0 and ocr_export_counts["val"] > 0,
        "train_val_test_split_present": any(split_counts[s]["images"] > 0 for s in ("train", "val", "test"))
        or split_counts["plate_number_reference_remapped"]["train"]["images"] > 0,
    }

    status = "passed" if not blockers else "failed"

    report = {
        "task": 142,
        "status": status,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "reviews": {
            "folder_structure": {
                "passed": all(folder_structure.values()),
                "directories": folder_structure,
            },
            "dataset_size": {
                "counts": size_counts,
                "splits": split_counts,
            },
            "annotation_quality": {
                "targets": annotation_reviews,
            },
            "ocr_quality": {
                "manifest_path": "data/datasets/manifests/ocr_manifest.csv",
                "manifest_rows": len(ocr_rows),
                "empty_transcriptions": ocr_empty_transcriptions,
                "manifest_valid": ocr_manifest_valid,
                "export_counts": ocr_export_counts,
            },
            "metadata": metadata_status,
            "backup": backup_status,
        },
        "milestone_readiness": milestone,
        "warnings": warnings,
        "blockers": blockers,
        "next_tasks": [
            "Task 143 — Configure dataset.yaml for YOLO training",
            "Task 144 — Train first YOLOv11 model",
            "Task 147 — Train OCR model (QC auto-filled transcriptions first)",
        ],
    }

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"Final dataset review status: {status.upper()}")
    print(f"Report: {report_path}")
    if warnings:
        print("Warnings:")
        for item in warnings:
            print(f"  - {item}")
    if blockers:
        print("Blockers:")
        for item in blockers:
            print(f"  - {item}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
