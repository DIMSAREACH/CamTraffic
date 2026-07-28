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


def _letterbox_square(img: np.ndarray, size: int, *, pad_value: int = 114) -> np.ndarray:
    """Pad to square then resize — preserves aspect (matches Ultralytics letterbox)."""
    h, w = img.shape[:2]
    if h < 1 or w < 1:
        return np.full((size, size, 3), pad_value, dtype=np.uint8)
    scale = min(size / float(h), size / float(w))
    nh, nw = max(1, int(round(h * scale))), max(1, int(round(w * scale)))
    interp = cv2.INTER_AREA if scale < 1.0 else cv2.INTER_CUBIC
    resized = cv2.resize(img, (nw, nh), interpolation=interp)
    canvas = np.full((size, size, 3), pad_value, dtype=np.uint8)
    top = (size - nh) // 2
    left = (size - nw) // 2
    canvas[top:top + nh, left:left + nw] = resized
    return canvas


def _unsharp(img: np.ndarray, amount: float = 1.15) -> np.ndarray:
    blur = cv2.GaussianBlur(img, (0, 0), 1.1)
    return cv2.addWeighted(img, amount, blur, 1.0 - amount, 0)


def preprocess_sign_bgr(img: np.ndarray, *, size: int | None = None) -> tuple[np.ndarray, dict]:
    """
    OpenCV sign prep for YOLO:
    dark→CLAHE, soft→unsharp, dull→adaptive blend, then letterbox to square.
    """
    size = size or _target_size()
    h, w = img.shape[:2]
    if h < 8 or w < 8:
        out = _letterbox_square(img, size)
        return out, {
            'size': f'{size}x{size}',
            'used_adaptive': False,
            'used_sharpen': False,
            'used_letterbox': True,
            'contrast': 0.0,
            'white_ratio': 0.0,
            'mean_luma': 0.0,
            'blur_score': 0.0,
        }

    gray0 = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mean_luma = float(np.mean(gray0))
    blur_score = float(cv2.Laplacian(gray0, cv2.CV_64F).var())

    # Stronger CLAHE on dark / low-contrast phone and CCTV crops.
    clip = 2.2
    if mean_luma < 55:
        clip = 3.6
    elif mean_luma < 95:
        clip = 3.0
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=clip, tileGridSize=(8, 8))
    enhanced = cv2.cvtColor(
        cv2.merge([clahe.apply(l_channel), a_channel, b_channel]),
        cv2.COLOR_LAB2BGR,
    )

    # Mild denoise only when very dark (night grain); otherwise keep edges sharp.
    if mean_luma < 50:
        enhanced = cv2.GaussianBlur(enhanced, (3, 3), 0)
    else:
        enhanced = cv2.GaussianBlur(enhanced, (3, 3), 0.6)

    used_sharpen = blur_score < 55.0 and mean_luma > 35.0
    if used_sharpen:
        enhanced = _unsharp(enhanced, amount=1.22 if blur_score < 30 else 1.12)

    gray = cv2.cvtColor(enhanced, cv2.COLOR_BGR2GRAY)
    white_ratio = float(np.mean(gray > 220))
    contrast = float(np.std(gray))
    # Adaptive threshold helps dull phone shots; it hurts clean catalog/sign art
    # (high white fields) and was dropping YOLO confidence below usable floors.
    used_adaptive = contrast < 44.0 and white_ratio < 0.50
    if used_adaptive:
        adapt = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2,
        )
        adapt_bgr = cv2.cvtColor(adapt, cv2.COLOR_GRAY2BGR)
        enhanced = cv2.addWeighted(enhanced, 0.70, adapt_bgr, 0.30, 0)

    out = _letterbox_square(enhanced, size)
    debug = {
        'size': f'{size}x{size}',
        'used_adaptive': used_adaptive,
        'used_sharpen': used_sharpen,
        'used_letterbox': True,
        'clahe_clip': round(clip, 2),
        'contrast': round(contrast, 2),
        'white_ratio': round(white_ratio, 4),
        'mean_luma': round(mean_luma, 2),
        'blur_score': round(blur_score, 2),
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
    return draw_detection_overlays_on_image(
        image_path,
        [{
            'bbox': bbox,
            'label': label,
            'confidence': confidence,
            'color': (0, 165, 255),
        }] if bbox else [],
    )


def draw_detection_overlays_on_image(
    image_path: str,
    items: list[dict],
) -> str | None:
    """
    Draw one or more normalized bboxes on an image.
    Each item: {bbox: {x1,y1,x2,y2}, label?, confidence?, color?(B,G,R)}
    """
    usable = [it for it in items if isinstance(it, dict) and it.get('bbox')]
    if not usable:
        return None
    img = cv2.imread(str(image_path))
    if img is None:
        return None
    h, w = img.shape[:2]
    drew = False

    def _ok_bbox(bbox: dict, *, kind: str = '') -> tuple[int, int, int, int] | None:
        try:
            x1n = float(bbox.get('x1', 0))
            y1n = float(bbox.get('y1', 0))
            x2n = float(bbox.get('x2', 1))
            y2n = float(bbox.get('y2', 1))
        except (TypeError, ValueError):
            return None
        bw = x2n - x1n
        bh = y2n - y1n
        if bw <= 0 or bh <= 0:
            return None
        # Plates are small horizontal strips — allow tighter geometry than vehicles/signs.
        if kind == 'plate':
            min_side, min_area = 0.012, 0.0008
            max_ratio, min_ratio = 12.0, 0.08
        elif kind in ('helmet', 'violation'):
            # Rider heads are tiny in street footage — keep small near-square boxes.
            min_side, min_area = 0.008, 0.0004
            max_ratio, min_ratio = 3.0, 0.33
        elif kind == 'vehicle':
            # Motorcycles / tuk-tuks are smaller than cars — don't drop them from UI.
            min_side, min_area = 0.015, 0.0012
            max_ratio, min_ratio = 8.0, 0.12
        else:
            min_side, min_area = 0.03, 0.004
            max_ratio, min_ratio = 8.0, 0.12
        if bw < min_side or bh < min_side or (bw * bh) < min_area:
            return None
        ratio = bw / bh if bh else 99
        if ratio > max_ratio or ratio < min_ratio:
            return None
        x1 = int(max(0.0, x1n) * w)
        y1 = int(max(0.0, y1n) * h)
        x2 = int(min(1.0, x2n) * w)
        y2 = int(min(1.0, y2n) * h)
        if x2 <= x1 or y2 <= y1:
            return None
        return x1, y1, x2, y2

    def _expand_sign_face(x1: int, y1: int, x2: int, y2: int) -> tuple[int, int, int, int]:
        """Grow text-tight sign boxes into a near-square face around the center."""
        bw, bh = max(1, x2 - x1), max(1, y2 - y1)
        cx, cy = (x1 + x2) / 2.0, (y1 + y2) / 2.0
        ratio = bw / bh
        side = float(max(bw, bh))
        if 0.72 <= ratio <= 1.35 and (bw * bh) >= (0.02 * w * h):
            side *= 1.12
        else:
            side = min(max(bw, bh) * 1.65, max(bw, bh) * 2.4, 0.92 * min(w, h))
        half = side / 2.0
        nx1 = int(max(0, cx - half))
        ny1 = int(max(0, cy - half))
        nx2 = int(min(w, cx + half))
        ny2 = int(min(h, cy + half))
        return nx1, ny1, nx2, ny2

    for item in usable:
        kind = str(item.get('kind') or '').lower()
        coords = _ok_bbox(item.get('bbox') or {}, kind=kind)
        if not coords:
            continue
        x1, y1, x2, y2 = coords
        if kind in ('sign', ''):
            # Empty kind used by draw_yolo_bbox_on_image (sign path).
            x1, y1, x2, y2 = _expand_sign_face(x1, y1, x2, y2)
        color = item.get('color') or (0, 255, 0)  # Ultralytics-style default: lime green
        if kind == 'vehicle' and not item.get('color'):
            color = (0, 255, 0)
        thickness = max(2, min(3, w // 220))
        cv2.rectangle(img, (x1, y1), (x2, y2), color, thickness)
        label = str(item.get('label') or '').strip()
        conf = float(item.get('confidence') or 0)
        if label:
            # Match Ultralytics plot style: "Car 0.92" (0–1), not "Car 92%"
            if conf > 1.0:
                conf_txt = f'{conf / 100.0:.2f}'
            elif conf > 0:
                conf_txt = f'{conf:.2f}'
            else:
                conf_txt = ''
            text = f'{label} {conf_txt}'.strip()
            font = cv2.FONT_HERSHEY_SIMPLEX
            scale = max(0.45, min(0.7, w / 900))
            (tw, th), baseline = cv2.getTextSize(text, font, scale, 1)
            ty = max(y1, th + 4)
            # Filled label strip like YOLO plot()
            cv2.rectangle(img, (x1, ty - th - 6), (x1 + tw + 6, ty + baseline), color, -1)
            cv2.putText(
                img, text, (x1 + 3, ty - 3),
                font, scale, (0, 0, 0), 1, cv2.LINE_AA,
            )
        drew = True
    if not drew:
        return None
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
