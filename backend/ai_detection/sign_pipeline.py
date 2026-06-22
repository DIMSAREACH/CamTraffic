"""
Unified sign preparation for upload and live webcam — same path to YOLO.

Guide frame → OpenCV localization → contrast/blur/threshold preprocess → 640×640 YOLO input.
"""
from __future__ import annotations

import logging
import os
import tempfile
from dataclasses import dataclass, field

import cv2
import numpy as np
from django.conf import settings

from .sign_localization import SignLocalizationResult, localize_traffic_sign

logger = logging.getLogger(__name__)


@dataclass
class SignPipelineResult:
    original_path: str
    roi_path: str
    yolo_path: str
    localized: bool = False
    localization: SignLocalizationResult | None = None
    annotated_path: str | None = None
    cleanup_paths: list[str] = field(default_factory=list)
    preprocess_debug: dict = field(default_factory=dict)

    def to_debug_dict(self) -> dict:
        loc_dbg = self.localization.to_debug_dict() if self.localization else {}
        return {
            **loc_dbg,
            **self.preprocess_debug,
            'localized': self.localized,
            'yolo_input': os.path.basename(self.yolo_path),
        }


def _target_size() -> int:
    return int(getattr(settings, 'AI_SIGN_YOLO_SIZE', 640))


def _temp_jpeg(img: np.ndarray, quality: int = 94) -> tuple[str, str]:
    fd, path = tempfile.mkstemp(suffix='.jpg')
    os.close(fd)
    cv2.imwrite(path, img, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    return path, path


def preprocess_sign_bgr(img: np.ndarray, *, size: int | None = None) -> tuple[np.ndarray, dict]:
    """CLAHE contrast, mild Gaussian blur, optional adaptive threshold, resize to square."""
    size = size or _target_size()
    h, w = img.shape[:2]
    if h < 8 or w < 8:
        out = cv2.resize(img, (size, size), interpolation=cv2.INTER_CUBIC)
        return out, {'size': f'{size}x{size}', 'used_adaptive': False, 'contrast': 0.0, 'white_ratio': 0.0}

    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.8, tileGridSize=(8, 8))
    enhanced = cv2.cvtColor(
        cv2.merge([clahe.apply(l_channel), a_channel, b_channel]),
        cv2.COLOR_LAB2BGR,
    )
    enhanced = cv2.GaussianBlur(enhanced, (3, 3), 0)

    gray = cv2.cvtColor(enhanced, cv2.COLOR_BGR2GRAY)
    white_ratio = float(np.mean(gray > 220))
    contrast = float(np.std(gray))
    used_adaptive = white_ratio > 0.22 or contrast < 44.0
    if used_adaptive:
        adapt = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2,
        )
        adapt_bgr = cv2.cvtColor(adapt, cv2.COLOR_GRAY2BGR)
        enhanced = cv2.addWeighted(enhanced, 0.70, adapt_bgr, 0.30, 0)

    interp = cv2.INTER_AREA if max(h, w) > size else cv2.INTER_CUBIC
    out = cv2.resize(enhanced, (size, size), interpolation=interp)
    debug = {
        'size': f'{size}x{size}',
        'used_adaptive': used_adaptive,
        'contrast': round(contrast, 2),
        'white_ratio': round(white_ratio, 4),
    }
    return out, debug


def draw_yolo_bbox_on_image(
    image_path: str,
    bbox: dict[str, float] | None,
    *,
    label: str = '',
    confidence: float = 0.0,
) -> str | None:
    """Draw normalized YOLO bbox on image; return temp JPEG path."""
    if not bbox:
        return None
    img = cv2.imread(str(image_path))
    if img is None:
        return None
    h, w = img.shape[:2]
    x1 = int(max(0.0, bbox.get('x1', 0)) * w)
    y1 = int(max(0.0, bbox.get('y1', 0)) * h)
    x2 = int(min(1.0, bbox.get('x2', 1)) * w)
    y2 = int(min(1.0, bbox.get('y2', 1)) * h)
    if x2 <= x1 or y2 <= y1:
        return None
    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 165, 255), max(2, w // 160))
    if label:
        text = f'{label} {confidence:.0f}%' if confidence > 0 else label
        cv2.putText(
            img, text, (x1, max(y1 - 6, 14)),
            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 165, 255), 1, cv2.LINE_AA,
        )
    path, _ = _temp_jpeg(img)
    return path


def prepare_unified_sign_input(image_path: str, *, localize: bool = True) -> SignPipelineResult:
    """
    Localize sign ROI (optional), preprocess identically for upload + webcam, write YOLO JPEG.
    """
    cleanup: list[str] = []
    original_path = str(image_path)
    roi_path = original_path
    localized = False
    localization: SignLocalizationResult | None = None

    if localize and getattr(settings, 'AI_LIVE_SIGN_LOCALIZATION_ENABLED', True):
        localization = localize_traffic_sign(original_path)
        if localization.found and localization.crop_path:
            roi_path = localization.crop_path
            localized = True
            if localization.cleanup_path:
                cleanup.append(localization.cleanup_path)

    img = cv2.imread(roi_path)
    if img is None:
        img = cv2.imread(original_path)
        roi_path = original_path
        localized = False
    if img is None:
        return SignPipelineResult(
            original_path=original_path,
            roi_path=original_path,
            yolo_path=original_path,
            localized=False,
            cleanup_paths=cleanup,
        )

    processed, preprocess_debug = preprocess_sign_bgr(img)
    yolo_path, yolo_tmp = _temp_jpeg(processed)
    cleanup.append(yolo_tmp)

    return SignPipelineResult(
        original_path=original_path,
        roi_path=roi_path,
        yolo_path=yolo_path,
        localized=localized,
        localization=localization,
        cleanup_paths=cleanup,
        preprocess_debug=preprocess_debug,
    )


def attach_pipeline_debug(
    payload: dict,
    prep: SignPipelineResult,
    *,
    yolo_raw: dict | None = None,
) -> dict:
    """Merge pipeline trace into API payload."""
    payload = dict(payload)
    trace = prep.to_debug_dict()
    if yolo_raw:
        trace['yolo_class_key'] = yolo_raw.get('class_key') or ''
        trace['yolo_class_id'] = yolo_raw.get('class_id')
        trace['yolo_confidence'] = yolo_raw.get('confidence')
        trace['yolo_class_name'] = trace['yolo_class_key']
    payload['pipeline_trace'] = trace
    payload['crop_size'] = trace.get('crop_size') or trace.get('size')
    if prep.localization and prep.localization.found:
        payload['sign_bbox'] = prep.localization.bbox
    elif yolo_raw and yolo_raw.get('sign_bbox'):
        payload['sign_bbox'] = yolo_raw['sign_bbox']
    return payload
