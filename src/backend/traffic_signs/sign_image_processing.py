"""Remove outside background from traffic sign reference images."""
from __future__ import annotations

from io import BytesIO

import numpy as np
from PIL import Image, ImageFilter

DISPLAY_LONG_EDGE = 480


def _red_mask(rgb: np.ndarray) -> np.ndarray:
    rgb = rgb.astype(np.int16)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    return (r > 110) & (r > g + 12) & (r > b + 12)


def _ink_mask(rgb: np.ndarray) -> np.ndarray:
    rgb = rgb.astype(np.int16)
    saturation = rgb.max(axis=2) - rgb.min(axis=2)
    color_ink = saturation > 25
    # Grayscale catalog art (low saturation) — keep non-white pixels as sign ink.
    luminance = rgb.mean(axis=2)
    gray_ink = luminance < 240
    return color_ink | gray_ink


def _visible_pixel_ratio(image: Image.Image) -> float:
    rgba = image.convert('RGBA')
    data = np.array(rgba)
    visible = int((data[:, :, 3] > 24).sum())
    total = data.shape[0] * data.shape[1]
    return visible / total if total else 0.0


def _prepare_sign_rgba(image: Image.Image) -> Image.Image:
    """Background-removed RGBA, or original art if removal would blank the image."""
    processed = remove_sign_background(image)
    if _visible_pixel_ratio(processed) < 0.05:
        return image.convert('RGBA')
    return processed


def _dilate(mask: np.ndarray, steps: int) -> np.ndarray:
    out = mask.copy()
    for _ in range(steps):
        padded = np.pad(out, 1, mode='constant', constant_values=False)
        out = (
            padded[:-2, 1:-1]
            | padded[2:, 1:-1]
            | padded[1:-1, :-2]
            | padded[1:-1, 2:]
            | padded[1:-1, 1:-1]
        )
    return out


def _prohibitory_disc_mask(rgb: np.ndarray) -> np.ndarray | None:
    """
    Filled circle that covers the whole prohibitory sign (red ring + white interior).
    """
    red = _red_mask(rgb)
    if red.sum() < 80:
        return None

    h, w = rgb.shape[:2]
    ys, xs = np.where(red)
    cy = float(ys.mean())
    cx = float(xs.mean())
    radii = np.sqrt((ys - cy) ** 2 + (xs - cx) ** 2)
    max_r = float(radii.max()) * 1.05

    yy, xx = np.ogrid[:h, :w]
    disc = (yy - cy) ** 2 + (xx - cx) ** 2 <= max_r * max_r
    if disc.sum() < 0.08 * disc.size:
        return None
    return disc


def _sign_keep_mask(rgb: np.ndarray) -> np.ndarray:
    """Pixels that belong to the sign artwork (never made transparent)."""
    disc = _prohibitory_disc_mask(rgb)
    if disc is not None:
        return disc

    h, w = rgb.shape[:2]
    ink = _ink_mask(rgb) | _red_mask(rgb)
    steps = max(64, int(min(h, w) * 0.18))
    return _dilate(ink, steps)


def remove_sign_background(
    image: Image.Image,
    *,
    white_tolerance: int = 32,
    black_tolerance: int = 50,
) -> Image.Image:
    """
    Remove catalog backdrop outside the sign shape.

    Inside the sign (full red circle for prohibitory signs): every pixel is kept,
    including white fill and black symbols.
    Outside: white / black / gray margins become transparent.
    """
    rgba = image.convert('RGBA')
    data = np.array(rgba)
    h, w = data.shape[:2]
    rgb = data[:, :, :3]

    keep = _sign_keep_mask(rgb)
    outside = ~keep

    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    white = (
        (r >= 255 - white_tolerance)
        & (g >= 255 - white_tolerance)
        & (b >= 255 - white_tolerance)
    )
    black = (r <= black_tolerance) & (g <= black_tolerance) & (b <= black_tolerance)
    gray = (np.abs(r.astype(np.int16) - g.astype(np.int16)) <= 18) & (
        np.abs(g.astype(np.int16) - b.astype(np.int16)) <= 18
    ) & (r >= 50) & (r <= 245)
    margin = outside & (white | black | gray)
    data[margin, 3] = 0

    alpha = data[:, :, 3]
    ys, xs = np.where(alpha > 16)
    if len(xs) == 0:
        return Image.fromarray(data, 'RGBA')

    pad = 2
    x1 = max(0, int(xs.min()) - pad)
    y1 = max(0, int(ys.min()) - pad)
    x2 = min(w, int(xs.max()) + pad + 1)
    y2 = min(h, int(ys.max()) + pad + 1)
    return Image.fromarray(data[y1:y2, x1:x2], 'RGBA')


def upscale_sign_for_display(
    image: Image.Image,
    long_edge: int = DISPLAY_LONG_EDGE,
) -> Image.Image:
    """Upscale small catalog art for crisp UI display (keeps alpha)."""
    rgba = image.convert('RGBA')
    w, h = rgba.size
    longest = max(w, h)
    if longest >= long_edge:
        return rgba
    scale = long_edge / longest
    nw = max(1, round(w * scale))
    nh = max(1, round(h * scale))
    upscaled = rgba.resize((nw, nh), Image.Resampling.LANCZOS)
    return upscaled.filter(ImageFilter.UnsharpMask(radius=1.2, percent=115, threshold=2))


def sign_png_bytes(image: Image.Image) -> bytes:
    """Encode a sign image as PNG with outside background removed."""
    out = BytesIO()
    _prepare_sign_rgba(image).save(out, format='PNG', optimize=True)
    return out.getvalue()


def sign_display_png_bytes(image: Image.Image, long_edge: int = DISPLAY_LONG_EDGE) -> bytes:
    """Background-removed PNG upscaled for catalog / AI detection UI."""
    out = BytesIO()
    upscale_sign_for_display(_prepare_sign_rgba(image), long_edge).save(
        out, format='PNG', optimize=True,
    )
    return out.getvalue()
