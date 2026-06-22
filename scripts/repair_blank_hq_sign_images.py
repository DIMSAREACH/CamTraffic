"""
Re-encode blank *_hq.png catalog images (transparent after bad bg removal).

Usage (from project root):
    python scripts/repair_blank_hq_sign_images.py
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

import numpy as np
from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image

from traffic_signs.models import TrafficSign
from traffic_signs.sign_image_processing import sign_display_png_bytes


def visible_pixels(path: Path) -> int:
    with Image.open(path) as img:
        data = np.array(img.convert("RGBA"))
    return int((data[:, :, 3] > 24).sum())


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


def find_legacy_media(sign: TrafficSign, media_root: Path) -> Path | None:
    if not sign.image:
        return None
    current = media_root / sign.image.name
    if current.is_file() and visible_pixels(current) > 50:
        return current

    stem = sign.sign_code.replace("-", "_")
    candidates = sorted(
        media_root.glob("signs/*"),
        key=lambda p: (
            0 if stem in p.name and "_hq" not in p.name else 1,
            len(p.name),
        ),
    )
    for path in candidates:
        if stem in path.name and path.suffix.lower() == ".png" and visible_pixels(path) > 50:
            return path
    return None


def encode_from_path(path: Path) -> bytes:
    with Image.open(path) as raw:
        return sign_display_png_bytes(raw)


def main() -> None:
    meta = load_meta()
    media_root = Path(settings.MEDIA_ROOT)
    repaired = 0
    skipped = 0
    failed = 0

    for sign in TrafficSign.objects.all().order_by("sign_code"):
        if not sign.image or not sign.image.name.endswith("_hq.png"):
            skipped += 1
            continue

        media_path = media_root / sign.image.name
        if media_path.is_file() and visible_pixels(media_path) > 50:
            skipped += 1
            continue

        src_path: Path | None = None
        if sign.sign_code in meta:
            folder, filename = meta[sign.sign_code]
            src_path = find_source(folder, filename)

        if src_path is None:
            src_path = find_legacy_media(sign, media_root)

        if src_path is None:
            failed += 1
            print(f"[FAIL] {sign.sign_code} — no visible source")
            continue

        try:
            png_data = encode_from_path(src_path)
            with Image.open(BytesIO(png_data)) as check:
                vis = int((np.array(check.convert("RGBA"))[:, :, 3] > 24).sum())
                if vis < 50:
                    failed += 1
                    print(f"[FAIL] {sign.sign_code} — encode still blank")
                    continue
                sign.image.save(
                    f"{sign.sign_code.replace('-', '_')}_hq.png",
                    ContentFile(png_data),
                    save=True,
                )
                print(f"[OK] {sign.sign_code:12} ← {src_path.name}  {check.size[0]}×{check.size[1]}")
                repaired += 1
        except OSError as exc:
            failed += 1
            print(f"[FAIL] {sign.sign_code} — {exc}")

    print()
    print(f"Repaired: {repaired}  Already OK: {skipped}  Failed: {failed}")


if __name__ == "__main__":
    main()
