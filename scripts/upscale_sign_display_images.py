"""
Upscale all traffic-sign images in the DB for clear UI display (~480px long edge).

Usage (from project root):
    python scripts/upscale_sign_display_images.py
"""
from __future__ import annotations

import json
import os
import sys
from io import BytesIO
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
META_JSON = PROJECT_ROOT / "ai" / "reference_sign_meta.json"
SOURCE_ROOT = Path(
    r"D:\Year4\Project Thesis\Expert System\Reference(PDF Download)\Dim Sareach\Road signs in Cambodia"
)

sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "camtraffic.settings")

import django

django.setup()

from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image

from traffic_signs.models import TrafficSign
from traffic_signs.sign_image_processing import (
    DISPLAY_LONG_EDGE,
    sign_display_png_bytes,
    upscale_sign_for_display,
)


def load_meta() -> dict[str, tuple[str, str]]:
    with open(META_JSON, encoding="utf-8") as fh:
        meta = json.load(fh)
    out: dict[str, tuple[str, str]] = {}
    for entry in meta.values():
        code = entry.get("sign_code", "")
        folder = entry.get("source_folder", "")
        file = entry.get("source_file", "")
        if code and folder and file:
            out[code] = (folder, file)
    return out


def find_source(folder: str, filename: str) -> Path | None:
    direct = SOURCE_ROOT / folder / filename
    if direct.is_file():
        return direct
    name_lower = filename.lower()
    for path in SOURCE_ROOT.rglob("*"):
        if path.is_file() and path.name.lower() == name_lower:
            return path
    return None


def encode_from_raw(raw: Image.Image) -> bytes:
    data = sign_display_png_bytes(raw)
    if len(data) > 500:
        return data
    buf = BytesIO()
    upscale_sign_for_display(raw.convert("RGBA")).save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def main() -> None:
    meta = load_meta()
    media_root = Path(settings.MEDIA_ROOT)
    updated = 0
    skipped = 0
    failed = 0

    for sign in TrafficSign.objects.all().order_by("sign_code"):
        code = sign.sign_code
        png_data: bytes | None = None

        src_path = None
        if code in meta:
            folder, filename = meta[code]
            src_path = find_source(folder, filename)

        if src_path and src_path.is_file():
            try:
                with Image.open(src_path) as raw:
                    png_data = encode_from_raw(raw)
            except OSError:
                png_data = None

        if png_data is None and sign.image:
            media_path = media_root / sign.image.name
            if media_path.is_file():
                try:
                    with Image.open(media_path) as existing:
                        longest = max(existing.size)
                        if longest >= DISPLAY_LONG_EDGE:
                            skipped += 1
                            continue
                        png_data = encode_from_raw(existing)
                except OSError:
                    png_data = None

        if not png_data:
            failed += 1
            print(f"[SKIP] {code} — no source")
            continue

        sign.image.save(f"{code.replace('-', '_')}_hq.png", ContentFile(png_data), save=True)
        with Image.open(BytesIO(png_data)) as check:
            print(f"[OK] {code:10} → {check.size[0]}×{check.size[1]}  {sign.image.name}")
        updated += 1

    print()
    print(f"Updated: {updated}  Already HQ: {skipped}  Failed: {failed}")


if __name__ == "__main__":
    main()
