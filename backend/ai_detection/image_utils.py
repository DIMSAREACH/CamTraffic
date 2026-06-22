"""Normalize uploaded images to JPEG for YOLO, PIL, and Django ImageField."""
import logging
import os
import tempfile
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)


def _upload_max_edge() -> int:
    return int(getattr(settings, 'AI_UPLOAD_MAX_EDGE', 1280))


def _downscale_for_inference(img):
    """Shrink very large uploads so YOLO / OCR run faster."""
    from PIL import Image

    max_edge = _upload_max_edge()
    w, h = img.size
    longest = max(w, h)
    if longest <= max_edge:
        return img
    scale = max_edge / longest
    nw = max(1, round(w * scale))
    nh = max(1, round(h * scale))
    return img.resize((nw, nh), Image.Resampling.LANCZOS)

ALLOWED_UPLOAD_EXTENSIONS = {
    '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.avif', '.gif', '.tif', '.tiff', '.heic', '.heif',
}


def prepare_detection_image(source_path: str) -> tuple[str, str | None, list[str]]:
    """
    Return (path_for_ai, jpeg_path_or_none, cleanup_paths).
    Converts uncommon formats (AVIF, HEIC, etc.) to JPEG when needed.
    """
    path = Path(source_path)
    ext = path.suffix.lower()
    cleanup: list[str] = []

    try:
        from PIL import Image

        with Image.open(path) as probe:
            if getattr(probe, 'n_frames', 1) > 1:
                probe.seek(0)
            needs_downscale = max(probe.size) > _upload_max_edge()

        if ext in ('.jpg', '.jpeg') and not needs_downscale:
            return str(path), None, cleanup

        img = Image.open(path)
        if getattr(img, 'n_frames', 1) > 1:
            img.seek(0)
        if img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')
        elif img.mode == 'L':
            img = img.convert('RGB')
        img = _downscale_for_inference(img)

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
        tmp.close()
        img.save(tmp.name, 'JPEG', quality=90)
        cleanup.append(tmp.name)
        return tmp.name, tmp.name, cleanup
    except Exception:
        logger.exception('Could not normalize image %s', source_path)
        if ext in ('.png', '.webp', '.bmp', '.gif', '.tif', '.tiff'):
            return str(path), None, cleanup
        raise ValueError(
            f'Unsupported or unreadable image format ({ext or "unknown"}). '
            'Use JPG, PNG, or WEBP.'
        )


def cleanup_temp_files(paths: list[str | None]) -> None:
    for item in paths:
        if item and os.path.exists(item):
            try:
                os.unlink(item)
            except OSError:
                logger.warning('Could not delete temp file %s', item)
