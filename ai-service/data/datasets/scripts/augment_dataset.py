#!/usr/bin/env python3
"""
Dataset Augmentation — CamTraffic
Reads images from raw/<category>/<class>/ and annotations/exports/BATCH-*/,
applies augmentations (flip, rotate, brightness, blur, scale, perspective),
and writes augmented image+label pairs to annotations/augmented/<class>/.

Usage:
    python augment_dataset.py [--class CLASS_NAME] [--target N] [--dry-run]

Requires:
    pip install opencv-python albumentations
"""

import argparse
import json
import os
import random
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import cv2
    import numpy as np
    import albumentations as A
    HAS_ALB = True
except ImportError:
    HAS_ALB = False
    try:
        import cv2
        import numpy as np
    except ImportError:
        cv2 = None
        np = None

SCRIPT_DIR   = Path(__file__).resolve().parent
DATASETS_DIR = SCRIPT_DIR.parent
RAW_DIR      = DATASETS_DIR / "raw"
ANN_DIR      = DATASETS_DIR / "annotations" / "exports"
AUG_DIR      = DATASETS_DIR / "annotations" / "augmented"
REPORT_DIR   = DATASETS_DIR / "manifests"
AUG_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(exist_ok=True)

IMG_EXTS = {".jpg", ".jpeg", ".png"}


def get_augmentation_pipeline():
    """Return an albumentations pipeline for traffic imagery augmentation."""
    if not HAS_ALB:
        return None
    return A.Compose(
        [
            A.HorizontalFlip(p=0.3),
            A.Affine(translate_percent={"x": (-0.05, 0.05), "y": (-0.05, 0.05)}, scale=(0.9, 1.1), rotate=(-15, 15), p=0.7),
            A.Perspective(scale=(0.02, 0.08), p=0.4),
            A.RandomBrightnessContrast(brightness_limit=0.3, contrast_limit=0.3, p=0.6),
            A.HueSaturationValue(hue_shift_limit=10, sat_shift_limit=20, val_shift_limit=20, p=0.4),
            A.GaussNoise(p=0.3),
            A.GaussianBlur(blur_limit=(3, 5), p=0.2),
            A.RandomShadow(p=0.2),
            A.RandomFog(fog_coef_range=(0.1, 0.3), p=0.15),
            A.Downscale(scale_range=(0.7, 0.9), p=0.2),
        ],
        bbox_params=A.BboxParams(format="yolo", label_fields=["class_labels"], min_visibility=0.3),
    )


def load_yolo_label(label_path: Path):
    """Load YOLO label file → list of [class_id, cx, cy, w, h]."""
    if not label_path.exists():
        return []
    rows = []
    for line in label_path.read_text().splitlines():
        parts = line.strip().split()
        if len(parts) == 5:
            rows.append([int(parts[0])] + [float(x) for x in parts[1:]])
    return rows


def save_yolo_label(label_path: Path, rows):
    with open(label_path, "w") as f:
        for r in rows:
            f.write(f"{r[0]} {r[1]:.6f} {r[2]:.6f} {r[3]:.6f} {r[4]:.6f}\n")


def find_source_images(class_name: str):
    """Collect (image_path, label_path) pairs for a class from raw/ and annotations/."""
    pairs = []

    # raw/<category>/<class_name>/
    for cat in RAW_DIR.iterdir() if RAW_DIR.exists() else []:
        cls_dir = cat / class_name
        if cls_dir.exists():
            for img in cls_dir.iterdir():
                if img.suffix.lower() in IMG_EXTS:
                    lbl = img.with_suffix(".txt")
                    pairs.append((img, lbl if lbl.exists() else None))

    # annotations/exports/BATCH-*/images/
    if ANN_DIR.exists():
        for batch in ANN_DIR.iterdir():
            imgs_dir = batch / "images"
            lbls_dir = batch / "labels"
            if not imgs_dir.exists():
                continue
            for img in imgs_dir.iterdir():
                if img.suffix.lower() in IMG_EXTS and class_name in img.name.lower():
                    lbl = (lbls_dir / img.stem).with_suffix(".txt") if lbls_dir.exists() else None
                    if lbl and not lbl.exists():
                        lbl = None
                    pairs.append((img, lbl))

    return pairs


def augment_image_cv2_only(img, n: int):
    """Simple augmentation without albumentations (fallback)."""
    results = []
    h, w = img.shape[:2]
    for i in range(n):
        aug = img.copy()
        # brightness
        factor = random.uniform(0.7, 1.3)
        aug = cv2.convertScaleAbs(aug, alpha=factor, beta=random.randint(-20, 20))
        # small rotation
        angle = random.uniform(-15, 15)
        M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
        aug = cv2.warpAffine(aug, M, (w, h))
        # horizontal flip
        if random.random() < 0.3:
            aug = cv2.flip(aug, 1)
        results.append(aug)
    return results


def run_augmentation(class_name: str, target: int, dry_run: bool = False) -> dict:
    pairs = find_source_images(class_name)
    n_src = len(pairs)
    if n_src == 0:
        print(f"  [{class_name}] No source images found — skip")
        return {"class": class_name, "source": 0, "generated": 0, "skipped": True}

    out_dir = AUG_DIR / class_name / "images"
    lbl_dir = AUG_DIR / class_name / "labels"
    if not dry_run:
        out_dir.mkdir(parents=True, exist_ok=True)
        lbl_dir.mkdir(parents=True, exist_ok=True)

    # Copy originals first
    generated = 0
    if not dry_run:
        for i, (img_p, lbl_p) in enumerate(pairs):
            shutil.copy2(img_p, out_dir / img_p.name)
            if lbl_p:
                shutil.copy2(lbl_p, lbl_dir / lbl_p.name)
        generated = n_src

    need = max(0, target - n_src)
    if need == 0:
        print(f"  [{class_name}] Already at target ({n_src}/{target})")
        return {"class": class_name, "source": n_src, "generated": generated, "skipped": False}

    pipeline = get_augmentation_pipeline() if HAS_ALB else None
    per_image = max(1, (need + n_src - 1) // n_src)
    aug_count = 0

    print(f"  [{class_name}] {n_src} sources → generating {need} augmented (×{per_image} each)")

    for img_p, lbl_p in pairs:
        if aug_count >= need:
            break

        if cv2 is None:
            print("    ERROR: opencv not installed, cannot augment images")
            break

        img = cv2.imread(str(img_p))
        if img is None:
            continue
        rows = load_yolo_label(lbl_p) if lbl_p else []

        for j in range(per_image):
            if aug_count >= need:
                break

            suffix = f"_aug{aug_count:04d}"
            out_name = img_p.stem + suffix + ".jpg"
            lbl_name = img_p.stem + suffix + ".txt"

            if dry_run:
                aug_count += 1
                continue

            try:
                if pipeline and rows:
                    bboxes = [[r[1], r[2], r[3], r[4]] for r in rows]
                    clsids = [r[0] for r in rows]
                    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    result = pipeline(image=rgb, bboxes=bboxes, class_labels=clsids)
                    aug_img = cv2.cvtColor(result["image"], cv2.COLOR_RGB2BGR)
                    new_rows = [
                        [c, *b] for c, b in zip(result["class_labels"], result["bboxes"])
                    ]
                    cv2.imwrite(str(out_dir / out_name), aug_img)
                    save_yolo_label(lbl_dir / lbl_name, new_rows)
                elif pipeline:
                    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    result = pipeline(image=rgb, bboxes=[], class_labels=[])
                    aug_img = cv2.cvtColor(result["image"], cv2.COLOR_RGB2BGR)
                    cv2.imwrite(str(out_dir / out_name), aug_img)
                else:
                    augs = augment_image_cv2_only(img, 1)
                    cv2.imwrite(str(out_dir / out_name), augs[0])
                aug_count += 1
            except Exception as e:
                print(f"    WARNING: augmentation failed for {img_p.name}: {e}")

    generated += aug_count
    total = n_src + aug_count
    print(f"  [{class_name}] Done → {total} images ({n_src} original + {aug_count} augmented)")
    return {"class": class_name, "source": n_src, "augmented": aug_count, "total": total, "target": target}


def main():
    parser = argparse.ArgumentParser(description="Augment CamTraffic dataset")
    parser.add_argument("--class", dest="cls", default=None, help="Single class to augment")
    parser.add_argument("--target", type=int, default=None, help="Override target count")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without writing files")
    args = parser.parse_args()

    if not HAS_ALB:
        print("WARNING: albumentations not installed. Using basic CV2 augmentation only.")
        print("         Install with: pip install albumentations\n")
    if cv2 is None:
        print("ERROR: opencv-python not installed. Cannot augment images.")
        print("       Install with: pip install opencv-python")
        return 1

    # Class → target map (same as collection_tracker)
    CLASS_TARGETS = {
        "no_entry": 150, "no_u_turn": 100, "no_left_turn": 100,
        "no_right_turn": 100, "no_overtaking": 80, "no_horn": 80,
        "parking_prohibited": 150, "speed_limit_20": 80, "speed_limit_30": 100,
        "speed_limit_40": 100, "speed_limit_50": 120, "speed_limit_60": 100,
        "stop": 150, "yield": 100, "one_way": 100,
        "pedestrian_crossing": 120, "school_zone": 80,
        "traffic_light_signal": 100, "unknown_sign": 100,
        "car_sedan": 200, "car_suv": 150, "car_pickup": 150,
        "motorcycle_small": 200, "motorcycle_large": 150,
        "bus": 120, "truck": 120, "van": 100, "tuk_tuk": 100,
        "plate_number": 500, "plate_khmer": 200, "plate_foreigner": 100,
    }

    if args.cls:
        classes = {args.cls: args.target or CLASS_TARGETS.get(args.cls, 100)}
    else:
        classes = CLASS_TARGETS

    print(f"{'─'*60}")
    print(f"CamTraffic Dataset Augmentation")
    if args.dry_run:
        print("  ** DRY RUN — no files will be written **")
    print(f"{'─'*60}\n")

    results = []
    for cls, tgt in classes.items():
        result = run_augmentation(cls, args.target or tgt, dry_run=args.dry_run)
        results.append(result)

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "dry_run": args.dry_run,
        "results": results,
    }
    report_path = REPORT_DIR / "augmentation_report.json"
    if not args.dry_run:
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\nReport → {report_path}")

    total_src = sum(r.get("source", 0) for r in results)
    total_aug = sum(r.get("augmented", r.get("generated", 0) - r.get("source", 0)) for r in results if not r.get("skipped"))
    print(f"\nTotal sources: {total_src}  |  Augmented: {total_aug}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
