"""Auto-capture vehicle and plate snapshot crops from detection frames."""

from __future__ import annotations

import logging
import uuid

import cv2
import numpy as np
from django.core.files.base import ContentFile

from .plate_ocr import _crop_region, _plate_regions

logger = logging.getLogger(__name__)


def _vehicle_crop(image: np.ndarray, vehicles: list[dict]) -> tuple[np.ndarray | None, str]:
    if not vehicles:
        return None, ''
    top = vehicles[0]
    bbox = top.get('bbox') or {}
    h, w = image.shape[:2]
    try:
        x1 = int(float(bbox.get('x1', 0)) * w)
        y1 = int(float(bbox.get('y1', 0)) * h)
        x2 = int(float(bbox.get('x2', 1)) * w)
        y2 = int(float(bbox.get('y2', 1)) * h)
    except (TypeError, ValueError):
        return None, ''

    pad_x = max(int((x2 - x1) * 0.04), 4)
    pad_y = max(int((y2 - y1) * 0.04), 4)
    crop = _crop_region(image, x1 - pad_x, y1 - pad_y, x2 + pad_x, y2 + pad_y)
    if crop is None:
        return None, ''
    return crop, 'vehicle_bbox'


def _plate_crop(
    image: np.ndarray,
    vehicles: list[dict],
    *,
    best_region: str = '',
) -> tuple[np.ndarray | None, str]:
    if best_region == 'full_frame':
        return image, 'full_frame'

    regions = _plate_regions(image, vehicles or [])
    if best_region:
        for crop, region in regions:
            if region == best_region:
                return crop, region

    preferred = ('vehicle_0_plate', 'frame_lower')
    for name in preferred:
        for crop, region in regions:
            if region == name:
                return crop, region

    for crop, region in regions:
        if region != 'full_frame':
            return crop, region
    return None, ''


def _encode_jpeg(crop: np.ndarray, prefix: str) -> ContentFile | None:
    ok, buf = cv2.imencode('.jpg', crop, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    if not ok:
        return None
    name = f'{prefix}-{uuid.uuid4().hex[:10]}.jpg'
    return ContentFile(buf.tobytes(), name=name)


def capture_evidence_snapshots(
    image_path: str,
    vehicles: list[dict] | None,
    plate_result: dict | None,
) -> dict:
    """
    Extract vehicle and plate crops from a detection frame.

    Returns ContentFile objects ready for ImageField assignment.
    """
    empty = {
        'vehicle_snapshot': None,
        'plate_snapshot': None,
        'vehicle_region': '',
        'plate_region': '',
        'captured': False,
    }
    try:
        image = cv2.imread(str(image_path))
        if image is None:
            logger.warning('Evidence capture skipped — unreadable image: %s', image_path)
            return empty

        vehicle_crop, vehicle_region = _vehicle_crop(image, vehicles or [])
        plate_crop, plate_region = _plate_crop(
            image,
            vehicles or [],
            best_region=(plate_result or {}).get('best_region', ''),
        )

        vehicle_file = _encode_jpeg(vehicle_crop, 'vehicle') if vehicle_crop is not None else None
        plate_file = _encode_jpeg(plate_crop, 'plate') if plate_crop is not None else None

        return {
            'vehicle_snapshot': vehicle_file,
            'plate_snapshot': plate_file,
            'vehicle_region': vehicle_region,
            'plate_region': plate_region,
            'captured': bool(vehicle_file or plate_file),
        }
    except Exception:
        logger.exception('Evidence capture failed for %s', image_path)
        return empty
