"""Detect placeholder sign images (green circle on black) vs real reference art."""
from __future__ import annotations

from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    Image = None  # type: ignore


def is_placeholder_sign_image(path: Path) -> bool:
    """True when PNG is mostly green + black with almost no red/white sign detail."""
    if Image is None or not path.is_file():
        return False
    try:
        with Image.open(path) as im:
            im = im.convert('RGB').resize((48, 48))
            pixels = list(im.getdata())
    except OSError:
        return False

    green = black = accent = 0
    for r, g, b in pixels:
        if g > 90 and g > r * 1.25 and g > b * 1.1:
            green += 1
        elif r < 48 and g < 48 and b < 48:
            black += 1
        elif r > 160 or b > 160 or (r > 110 and g < 90):
            accent += 1

    total = len(pixels)
    if total == 0:
        return True
    accent_ratio = accent / total
    green_ratio = green / total
    black_ratio = black / total
    if green_ratio > 0.55 and accent_ratio < 0.08:
        return True
    return accent_ratio < 0.07 and green_ratio > 0.12 and black_ratio > 0.18
