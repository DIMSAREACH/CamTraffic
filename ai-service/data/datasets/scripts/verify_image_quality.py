"""Task 164 — Verify image quality: resolution, blur detection, count."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify dataset image quality")
    parser.add_argument("--input-dir", required=True, help="Root image directory")
    parser.add_argument("--min-width", type=int, default=640)
    parser.add_argument("--min-height", type=int, default=480)
    parser.add_argument("--blur-threshold", type=float, default=100.0,
                        help="Laplacian variance below this = blurry")
    parser.add_argument("--count-only", action="store_true",
                        help="Only count images per class, skip quality checks")
    parser.add_argument("--output", default="runs/evaluation/image_quality_report.json")
    return parser.parse_args()


def collect_images(root: Path) -> dict[str, list[Path]]:
    """Return dict of {class_name: [image_paths]}."""
    result: dict[str, list[Path]] = {}
    for child in sorted(root.iterdir()):
        if child.is_dir():
            imgs = [p for p in child.rglob("*") if p.suffix.lower() in IMAGE_EXTS]
            if imgs:
                result[child.name] = imgs
    if not result:
        imgs = [p for p in root.rglob("*") if p.suffix.lower() in IMAGE_EXTS]
        if imgs:
            result["_all"] = imgs
    return result


def check_image(path: Path, min_w: int, min_h: int, blur_thresh: float) -> dict:
    try:
        import cv2
        img = cv2.imread(str(path))
        if img is None:
            return {"path": str(path), "status": "unreadable"}
        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        issues = []
        if w < min_w or h < min_h:
            issues.append(f"low_resolution ({w}x{h})")
        if blur_score < blur_thresh:
            issues.append(f"blurry (score={blur_score:.1f})")
        return {
            "path": str(path),
            "width": w,
            "height": h,
            "blur_score": round(blur_score, 2),
            "status": "fail" if issues else "ok",
            "issues": issues,
        }
    except ImportError:
        return {"path": str(path), "status": "opencv_not_installed"}
    except Exception as exc:
        return {"path": str(path), "status": "error", "error": str(exc)}


def main() -> None:
    args = parse_args()
    root = Path(args.input_dir)
    if not root.exists():
        print(f"Directory not found: {root}")
        return

    classes = collect_images(root)
    if not classes:
        print("No images found.")
        return

    print(f"\n{'Class':<35} {'Images':>8}")
    print("-" * 45)
    total = 0
    for cls, imgs in sorted(classes.items()):
        print(f"{cls:<35} {len(imgs):>8}")
        total += len(imgs)
    print("-" * 45)
    print(f"{'TOTAL':<35} {total:>8}\n")

    if args.count_only:
        return

    try:
        import cv2  # noqa: F401
    except ImportError:
        print("opencv-python not installed — skipping quality checks.")
        print("Install with: pip install opencv-python")
        return

    print("Running quality checks...\n")
    results: list[dict] = []
    failed = 0
    for cls, imgs in classes.items():
        for img_path in imgs:
            r = check_image(img_path, args.min_width, args.min_height, args.blur_threshold)
            results.append(r)
            if r.get("status") not in ("ok", "opencv_not_installed"):
                failed += 1
                print(f"  FAIL {img_path.name}: {r.get('issues', r.get('status'))}")

    passed = len(results) - failed
    print(f"\nResults: {passed}/{len(results)} passed quality checks")
    if failed:
        print(f"  {failed} images failed — review and remove/replace them")

    report = {
        "task": 164,
        "total_images": len(results),
        "passed": passed,
        "failed": failed,
        "min_width": args.min_width,
        "min_height": args.min_height,
        "blur_threshold": args.blur_threshold,
        "class_counts": {cls: len(imgs) for cls, imgs in classes.items()},
        "failures": [r for r in results if r.get("status") not in ("ok",)],
    }
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\nReport: {out}")


if __name__ == "__main__":
    main()
