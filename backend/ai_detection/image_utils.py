"""Normalize uploaded images to JPEG for YOLO, PIL, and Django ImageField."""
import logging
import os
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

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

    if ext in ('.jpg', '.jpeg'):
        return str(path), None, cleanup

    try:
        from PIL import Image

        img = Image.open(path)
        if getattr(img, 'n_frames', 1) > 1:
            img.seek(0)
        if img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')
        elif img.mode == 'L':
            img = img.convert('RGB')

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
        tmp.close()
        img.save(tmp.name, 'JPEG', quality=92)
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
