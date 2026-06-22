"""
Replace blank/transparent placeholder sign images with real source images.

Usage (from project root):
    python scripts/fix_blank_sign_images.py

Source images:  d:/Year4/Project Thesis/Expert System/Reference(PDF Download)/
                Dim Sareach/Road signs in Cambodia/<folder>/<file>.png
Mapping via:    ai/reference_sign_meta.json  (source_folder + source_file fields)
"""

import os
import sys
import json
import shutil
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
MEDIA_SIGNS = BACKEND_DIR / "media" / "signs"
META_JSON = PROJECT_ROOT / "ai" / "reference_sign_meta.json"
SOURCE_ROOT = Path(r"D:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Road signs in Cambodia")

sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "camtraffic.settings")

import django
django.setup()

from django.conf import settings
from traffic_signs.models import TrafficSign
from PIL import Image
import numpy as np


def is_blank_image(path: Path) -> bool:
    """Return True if the PNG is mostly transparent/blank (< 5% visible pixels)."""
    try:
        with Image.open(path) as img:
            rgba = img.convert("RGBA")
            data = np.array(rgba)
            visible = int((data[:, :, 3] > 24).sum())
            total = img.width * img.height
            return total == 0 or (visible / total) < 0.05
    except Exception:
        return True


def find_source_file(source_folder: str, source_file: str) -> Path | None:
    """Try to locate the source image under SOURCE_ROOT."""
    # Direct path
    candidate = SOURCE_ROOT / source_folder / source_file
    if candidate.exists():
        return candidate

    # Case-insensitive search across all subfolders
    name_lower = source_file.lower()
    for f in SOURCE_ROOT.rglob("*"):
        if f.is_file() and f.name.lower() == name_lower:
            return f

    return None


def main():
    # Load sign metadata (source_folder + source_file mapping)
    with open(META_JSON, encoding="utf-8") as fh:
        meta: dict = json.load(fh)

    # Build lookup: sign_code → (source_folder, source_file)
    code_to_source: dict[str, tuple[str, str]] = {}
    for entry in meta.values():
        code = entry.get("sign_code", "")
        sf = entry.get("source_folder", "")
        fn = entry.get("source_file", "")
        if code and sf and fn:
            code_to_source[code] = (sf, fn)

    print(f"Meta entries with source: {len(code_to_source)}")

    replaced = 0
    skipped_real = 0
    not_found = 0
    no_meta = 0

    for sign in TrafficSign.objects.all().order_by("sign_code"):
        if not sign.image:
            # No image at all — try to assign from source
            pass
        else:
            media_path = Path(settings.MEDIA_ROOT) / sign.image.name
            if media_path.exists() and not is_blank_image(media_path):
                skipped_real += 1
                continue  # Already has a real image

        # Need a real image — look up source
        if sign.sign_code not in code_to_source:
            no_meta += 1
            continue

        src_folder, src_file = code_to_source[sign.sign_code]
        source_path = find_source_file(src_folder, src_file)
        if source_path is None:
            print(f"  [NOT FOUND] {sign.sign_code} — {src_folder}/{src_file}")
            not_found += 1
            continue

        # Copy to media/signs/ with a clean filename
        ext = source_path.suffix.lower() or ".png"
        dest_name = f"{sign.sign_code.replace('-', '_')}_{source_path.stem[:20]}{ext}"
        dest_path = MEDIA_SIGNS / dest_name

        shutil.copy2(source_path, dest_path)

        # Update DB field (relative to MEDIA_ROOT)
        sign.image = f"signs/{dest_name}"
        sign.save(update_fields=["image"])

        print(f"  [OK] {sign.sign_code:8} — {source_path.name} → {dest_name}")
        replaced += 1

    print()
    print(f"Results:")
    print(f"  Replaced blank/missing images : {replaced}")
    print(f"  Already had real images       : {skipped_real}")
    print(f"  No metadata entry             : {no_meta}")
    print(f"  Source file not found         : {not_found}")


if __name__ == "__main__":
    main()
