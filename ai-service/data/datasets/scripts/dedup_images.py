"""Task 165 — Remove duplicate images using perceptual hashing."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Remove duplicate images from dataset")
    parser.add_argument("--input-dir", required=True, help="Input image directory")
    parser.add_argument("--output-dir", required=True, help="Output deduplicated directory")
    parser.add_argument("--dry-run", action="store_true", help="Report duplicates without copying")
    parser.add_argument("--output", default="runs/evaluation/dedup_report.json")
    return parser.parse_args()


def md5_hash(path: Path) -> str:
    h = hashlib.md5()
    h.update(path.read_bytes())
    return h.hexdigest()


def phash(path: Path) -> str | None:
    """Perceptual hash using PIL if available, else fall back to md5."""
    try:
        from PIL import Image
        import struct

        img = Image.open(path).convert("L").resize((8, 8), Image.LANCZOS)
        pixels = list(img.getdata())
        avg = sum(pixels) / len(pixels)
        bits = "".join("1" if p >= avg else "0" for p in pixels)
        hex_hash = f"{int(bits, 2):016x}"
        return hex_hash
    except ImportError:
        return md5_hash(path)
    except Exception:
        return md5_hash(path)


def main() -> None:
    args = parse_args()
    input_root = Path(args.input_dir)
    output_root = Path(args.output_dir)

    if not input_root.exists():
        print(f"Input directory not found: {input_root}")
        return

    all_images = sorted(
        p for p in input_root.rglob("*") if p.suffix.lower() in IMAGE_EXTS
    )
    print(f"Found {len(all_images)} images in {input_root}")

    seen: dict[str, Path] = {}
    duplicates: list[dict] = []
    unique: list[Path] = []

    for img_path in all_images:
        h = phash(img_path)
        if h in seen:
            duplicates.append({
                "duplicate": str(img_path),
                "original": str(seen[h]),
                "hash": h,
            })
        else:
            seen[h] = img_path
            unique.append(img_path)

    print(f"Unique images: {len(unique)}")
    print(f"Duplicates found: {len(duplicates)}")

    if duplicates:
        print("\nDuplicates:")
        for d in duplicates[:10]:
            print(f"  {Path(d['duplicate']).name} → duplicate of {Path(d['original']).name}")
        if len(duplicates) > 10:
            print(f"  ... and {len(duplicates) - 10} more")

    if not args.dry_run:
        output_root.mkdir(parents=True, exist_ok=True)
        copied = 0
        for img_path in unique:
            rel = img_path.relative_to(input_root)
            dest = output_root / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(img_path, dest)
            copied += 1
        print(f"\nCopied {copied} unique images to: {output_root}")
    else:
        print("\nDry run — no files copied.")

    report = {
        "task": 165,
        "input_dir": str(input_root),
        "output_dir": str(output_root) if not args.dry_run else None,
        "total_input": len(all_images),
        "unique": len(unique),
        "duplicates_removed": len(duplicates),
        "dry_run": args.dry_run,
        "duplicates": duplicates[:50],
    }
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Report: {out}")


if __name__ == "__main__":
    main()
