#!/usr/bin/env python3
"""
Dataset Collection Tracker — CamTraffic
Scans raw/, annotations/exports/, and splits/ to produce a per-class
inventory report showing collected vs target counts, plus gap analysis.
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
DATASETS_DIR = SCRIPT_DIR.parent
RAW_DIR     = DATASETS_DIR / "raw"
ANN_DIR     = DATASETS_DIR / "annotations" / "exports"
SPLITS_DIR  = DATASETS_DIR / "splits"
OUT_DIR     = DATASETS_DIR / "manifests"
OUT_DIR.mkdir(exist_ok=True)

# ── Collection Targets (minimum per class for a reliable model) ────────────────
TARGETS = {
    # Traffic Signs
    "no_entry":              150,
    "no_u_turn":             100,
    "no_left_turn":          100,
    "no_right_turn":         100,
    "no_overtaking":         80,
    "no_horn":               80,
    "parking_prohibited":    150,
    "speed_limit_20":        80,
    "speed_limit_30":        100,
    "speed_limit_40":        100,
    "speed_limit_50":        120,
    "speed_limit_60":        100,
    "stop":                  150,
    "yield":                 100,
    "one_way":               100,
    "pedestrian_crossing":   120,
    "school_zone":           80,
    "traffic_light_signal":  100,
    "unknown_sign":          100,
    # Vehicles
    "car_sedan":             200,
    "car_suv":               150,
    "car_pickup":            150,
    "motorcycle_small":      200,
    "motorcycle_large":      150,
    "bus":                   120,
    "truck":                 120,
    "van":                   100,
    "tuk_tuk":               100,
    # License Plates
    "plate_number":          500,
    "plate_khmer":           200,
    "plate_foreigner":       100,
}

IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def count_images(folder: Path) -> int:
    if not folder.exists():
        return 0
    return sum(1 for f in folder.rglob("*") if f.suffix.lower() in IMG_EXTS)


def _build_split_class_counts():
    """Scan all splits' label files, return dict: class_id → bounding_box_count."""
    counts: dict[int, int] = {}
    if not SPLITS_DIR.exists():
        return counts
    for split in SPLITS_DIR.iterdir():
        if not split.is_dir():
            continue
        for sub in ("train", "val", "test", "labels"):
            lbl_dir = split / sub
            if not lbl_dir.exists():
                continue
            for lf in lbl_dir.rglob("*.txt"):
                for line in lf.read_text(errors="ignore").splitlines():
                    parts = line.strip().split()
                    if parts and parts[0].isdigit():
                        cls_id = int(parts[0])
                        counts[cls_id] = counts.get(cls_id, 0) + 1
    return counts


# Module-level cache
_SPLIT_CLASS_COUNTS: dict[int, int] | None = None


def count_in_splits(class_name: str) -> int:
    """Return bbox count for class_name by scanning split label files."""
    global _SPLIT_CLASS_COUNTS
    if _SPLIT_CLASS_COUNTS is None:
        _SPLIT_CLASS_COUNTS = _build_split_class_counts()

    # Find class_id from TARGETS keys index or from class_map.json
    class_map_path = DATASETS_DIR / "labels" / "yolo" / "class-map.json"
    if class_map_path.exists():
        import json as _json
        cmap = _json.loads(class_map_path.read_text())
        # cmap: {id: name} — invert
        for k, v in cmap.items():
            if v == class_name:
                return _SPLIT_CLASS_COUNTS.get(int(k), 0)
    return 0


def scan_raw(class_name: str) -> int:
    """Count images in raw/<category>/<class_name>/, raw/<class_name>/, and augmented/<class_name>/."""
    total = 0
    for category in RAW_DIR.iterdir() if RAW_DIR.exists() else []:
        if not category.is_dir():
            continue
        class_dir = category / class_name
        total += count_images(class_dir)
    # Also count pre-augmented images
    aug_dir = DATASETS_DIR / "annotations" / "augmented" / class_name / "images"
    total += count_images(aug_dir)
    return total


def scan_annotations(class_name: str) -> int:
    """Count labeled images in annotations/exports/BATCH-*/images/ whose filenames match class."""
    total = 0
    if not ANN_DIR.exists():
        return 0
    for batch in ANN_DIR.iterdir():
        img_dir = batch / "images"
        if not img_dir.exists():
            continue
        for f in img_dir.iterdir():
            if f.suffix.lower() in IMG_EXTS and class_name in f.name.lower():
                total += 1
    return total


def scan_splits_all() -> dict:
    """Count total images in each named split directory."""
    result = {}
    if not SPLITS_DIR.exists():
        return result
    for split in SPLITS_DIR.iterdir():
        if not split.is_dir():
            continue
        count = 0
        for sub in ("images", "train", "val", "test"):
            count += count_images(split / sub)
        if count:
            result[split.name] = count
    return result


def build_report() -> dict:
    print("Scanning dataset directories...\n")

    rows = []
    total_collected = 0
    total_target = 0
    classes_ready = 0

    for cls, target in TARGETS.items():
        raw_count   = scan_raw(cls)
        ann_count   = scan_annotations(cls)
        split_count = count_in_splits(cls)
        collected   = max(raw_count, ann_count, split_count)
        pct        = round(collected / target * 100, 1) if target else 0
        gap        = max(0, target - collected)
        ready      = collected >= target

        total_collected += collected
        total_target    += target
        if ready:
            classes_ready += 1

        rows.append({
            "class":            cls,
            "collected":        collected,
            "target":           target,
            "gap":              gap,
            "pct":              pct,
            "ready":            ready,
            "from_raw_folder":  raw_count,
            "from_annotations": ann_count,
            "from_splits":      split_count,
        })
        status = "✓" if ready else f"need {gap} more"
        bar = "#" * int(pct / 5) + "-" * (20 - int(pct / 5))
        print(f"  {cls:<28s}  {collected:>4}/{target:<4}  [{bar}] {pct:>5.1f}%  {status}")

    split_summary = scan_splits_all()
    overall_pct = round(total_collected / total_target * 100, 1) if total_target else 0

    report = {
        "generated_at":     datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_collected": total_collected,
            "total_target":    total_target,
            "overall_pct":     overall_pct,
            "classes_ready":   classes_ready,
            "classes_total":   len(TARGETS),
        },
        "splits_available":  split_summary,
        "per_class":         rows,
    }

    print(f"\n{'─'*70}")
    print(f"  Overall:  {total_collected}/{total_target} images  ({overall_pct}%)")
    print(f"  Classes ready:  {classes_ready}/{len(TARGETS)}")
    if split_summary:
        print(f"\n  Pre-split datasets:")
        for name, cnt in split_summary.items():
            print(f"    {name}: {cnt} images")
    print(f"{'─'*70}\n")
    return report


def write_markdown(report: dict, out_path: Path) -> None:
    lines = [
        "# Dataset Collection Status",
        f"> Generated: {report['generated_at']}",
        "",
        "## Summary",
        f"| Metric | Value |",
        f"|--------|-------|",
        f"| Total collected | {report['summary']['total_collected']} |",
        f"| Total target    | {report['summary']['total_target']} |",
        f"| Overall %       | {report['summary']['overall_pct']}% |",
        f"| Classes ready   | {report['summary']['classes_ready']} / {report['summary']['classes_total']} |",
        "",
        "## Per-Class Inventory",
        "| Class | Collected | Target | Gap | % | Status |",
        "|-------|-----------|--------|-----|---|--------|",
    ]
    for r in report["per_class"]:
        status = "READY" if r["ready"] else f"need {r['gap']} more"
        lines.append(
            f"| {r['class']} | {r['collected']} | {r['target']} | {r['gap']} | {r['pct']}% | {status} |"
        )

    if report.get("splits_available"):
        lines += [
            "",
            "## Available Pre-Split Datasets",
            "| Dataset | Images |",
            "|---------|--------|",
        ]
        for name, cnt in report["splits_available"].items():
            lines.append(f"| {name} | {cnt} |")

    lines += [
        "",
        "## Next Collection Priorities",
        "Classes needing the most images (sorted by gap):",
        "",
    ]
    gaps = sorted(report["per_class"], key=lambda x: -x["gap"])
    for r in gaps[:10]:
        if r["gap"] > 0:
            lines.append(f"- **{r['class']}**: need {r['gap']} more images (have {r['collected']}/{r['target']})")

    lines += [
        "",
        "## Collection Checklist",
        "- [ ] Traffic signs: photograph each class at multiple angles, distances, lighting",
        "- [ ] Vehicles: capture at intersections, parking lots, roadside (day + night)",
        "- [ ] License plates: capture varied plates (private, govt, tuk-tuk, foreigner)",
        "- [ ] Minimum 640×480 resolution per image",
        "- [ ] Run `dedup_images.py` after each collection session",
        "- [ ] Run `verify_image_quality.py` to flag blurry/low-res images",
        "- [ ] Annotate in Roboflow, export YOLO v8 format",
        "- [ ] Run `verify_labels.py` after export",
        "- [ ] Update `annotation_batch_log.csv` with batch number and date",
    ]

    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Markdown report → {out_path}")


def main():
    report = build_report()

    json_path = OUT_DIR / "collection_status.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"JSON report     → {json_path}")

    md_path = DATASETS_DIR.parent.parent.parent / "docs" / "final-year-project" / "DATASET-COLLECTION-STATUS.md"
    md_path.parent.mkdir(parents=True, exist_ok=True)
    write_markdown(report, md_path)

    return 0


if __name__ == "__main__":
    sys.exit(main())
