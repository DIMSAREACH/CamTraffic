"""
Locate a traffic sign inside a live webcam guide-box crop using OpenCV.

Uses HSV red masking + Hough circles for circular prohibitory signs, with contour
fallback for stop octagons and compact sign blobs. Returns a tight crop for YOLO.
"""
from __future__ import annotations

import logging
import os
import tempfile
from dataclasses import dataclass, field

import cv2
import numpy as np
from django.conf import settings

logger = logging.getLogger(__name__)


@dataclass
class SignLocalizationResult:
    found: bool = False
    bbox: dict[str, float] = field(default_factory=lambda: {'x1': 0.0, 'y1': 0.0, 'x2': 1.0, 'y2': 1.0})
    crop_path: str | None = None
    cleanup_path: str | None = None
    method: str = 'none'
    guide_width: int = 0
    guide_height: int = 0
    crop_width: int = 0
    crop_height: int = 0
    red_ratio: float = 0.0
    circle_score: float = 0.0

    def to_debug_dict(self) -> dict:
        return {
            'found': self.found,
            'method': self.method,
            'guide_size': f'{self.guide_width}x{self.guide_height}',
            'crop_size': f'{self.crop_width}x{self.crop_height}',
            'bbox': {k: round(v, 4) for k, v in self.bbox.items()},
            'red_ratio': round(self.red_ratio, 4),
            'circle_score': round(self.circle_score, 4),
        }


def _enabled() -> bool:
    return bool(getattr(settings, 'AI_LIVE_SIGN_LOCALIZATION_ENABLED', True))


def _red_mask(hsv: np.ndarray) -> np.ndarray:
    mask = cv2.inRange(hsv, np.array([0, 70, 65]), np.array([14, 255, 255]))
    mask |= cv2.inRange(hsv, np.array([165, 70, 65]), np.array([180, 255, 255]))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    return mask


def _yellow_mask(hsv: np.ndarray) -> np.ndarray:
    return cv2.inRange(hsv, np.array([14, 70, 70]), np.array([42, 255, 255]))


def _norm_bbox(x1: int, y1: int, x2: int, y2: int, w: int, h: int) -> dict[str, float]:
    return {
        'x1': round(max(0.0, x1 / w), 4),
        'y1': round(max(0.0, y1 / h), 4),
        'x2': round(min(1.0, x2 / w), 4),
        'y2': round(min(1.0, y2 / h), 4),
    }


def _pad_box(x1: int, y1: int, x2: int, y2: int, w: int, h: int, pad_frac: float = 0.10) -> tuple[int, int, int, int]:
    bw, bh = x2 - x1, y2 - y1
    pad_x = max(int(bw * pad_frac), 4)
    pad_y = max(int(bh * pad_frac), 4)
    return (
        max(0, x1 - pad_x),
        max(0, y1 - pad_y),
        min(w, x2 + pad_x),
        min(h, y2 + pad_y),
    )


def _write_crop(img: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> tuple[str | None, int, int]:
    crop = img[y1:y2, x1:x2]
    if crop.size == 0:
        return None, 0, 0
    ch, cw = crop.shape[:2]
    fd, path = tempfile.mkstemp(suffix='.jpg')
    os.close(fd)
    cv2.imwrite(path, crop, [int(cv2.IMWRITE_JPEG_QUALITY), 94])
    return path, cw, ch


def _circularity(cnt) -> float:
    area = cv2.contourArea(cnt)
    peri = cv2.arcLength(cnt, True)
    if area <= 0 or peri <= 0:
        return 0.0
    return float(4 * np.pi * area / (peri * peri))


def _hough_red_circle(img: np.ndarray, red_mask: np.ndarray) -> tuple[int, int, int, float] | None:
    h, w = img.shape[:2]
    min_dim = min(h, w)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.bitwise_and(gray, gray, mask=red_mask)
    gray = cv2.medianBlur(gray, 5)
    min_r = max(12, int(min_dim * 0.10))
    max_r = max(min_r + 8, int(min_dim * 0.46))
    circles = cv2.HoughCircles(
        gray,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=max(min_dim // 3, 40),
        param1=110,
        param2=28,
        minRadius=min_r,
        maxRadius=max_r,
    )
    if circles is None:
        return None

    best: tuple[int, int, int, float] | None = None
    for cx, cy, r in np.round(circles[0]).astype(int):
        cx, cy, r = int(cx), int(cy), int(r)
        if r < min_r or r > max_r:
            continue
        x1, y1 = max(0, cx - r), max(0, cy - r)
        x2, y2 = min(w, cx + r), min(h, cy + r)
        roi = red_mask[y1:y2, x1:x2]
        if roi.size == 0:
            continue
        red_fill = float(np.mean(roi > 0))
        if red_fill < 0.14:
            continue
        score = red_fill * r
        if best is None or score > best[3]:
            best = (cx, cy, r, score)
    return best


def _contour_candidates(img: np.ndarray, mask: np.ndarray, w: int, h: int) -> list[tuple[float, int, int, int, int, str]]:
    area_total = float(h * w)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out: list[tuple[float, int, int, int, int, str]] = []
    for cnt in sorted(contours, key=cv2.contourArea, reverse=True)[:10]:
        area = cv2.contourArea(cnt)
        if area < max(500, area_total * 0.012):
            continue
        x, y, bw, bh = cv2.boundingRect(cnt)
        aspect = bw / max(bh, 1)
        if aspect < 0.35 or aspect > 2.8:
            continue
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.04 * peri, True)
        sides = len(approx)
        circ = _circularity(cnt)
        roi = mask[y:y + bh, x:x + bw]
        color_fill = float(np.mean(roi > 0)) if roi.size else 0.0
        if color_fill < 0.12:
            continue
        method = 'contour_red'
        if 7 <= sides <= 10 and circ < 0.82:
            method = 'octagon_stop'
        elif circ >= 0.72:
            method = 'circle_contour'
        score = area * color_fill * (1.2 if method != 'contour_red' else 1.0)
        out.append((score, x, y, x + bw, y + bh, method))
    out.sort(key=lambda item: item[0], reverse=True)
    return out


def localize_traffic_sign(image_path: str) -> SignLocalizationResult:
    """Find sign region in guide-box image; write tight JPEG crop for YOLO."""
    result = SignLocalizationResult()
    if not _enabled():
        return result

    try:
        img = cv2.imread(str(image_path))
    except OSError:
        return result
    if img is None:
        return result

    h, w = img.shape[:2]
    if h < 48 or w < 48:
        return result

    result.guide_width = w
    result.guide_height = h
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    red_mask = _red_mask(hsv)
    result.red_ratio = float(np.count_nonzero(red_mask)) / float(h * w)

    pick: tuple[int, int, int, int, str] | None = None

    hough = _hough_red_circle(img, red_mask)
    if hough:
        cx, cy, r, score = hough
        result.circle_score = score
        x1, y1, x2, y2 = _pad_box(cx - r, cy - r, cx + r, cy + r, w, h, 0.08)
        pick = (x1, y1, x2, y2, 'hough_circle')

    if not pick:
        for score, x1, y1, x2, y2, method in _contour_candidates(img, red_mask, w, h):
            if score <= 0:
                continue
            x1, y1, x2, y2 = _pad_box(x1, y1, x2, y2, w, h)
            pick = (x1, y1, x2, y2, method)
            break

    if not pick and result.red_ratio < 0.04:
        yellow = _yellow_mask(hsv)
        yellow = cv2.morphologyEx(yellow, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        for score, x1, y1, x2, y2, method in _contour_candidates(img, yellow, w, h):
            if score <= 0:
                continue
            x1, y1, x2, y2 = _pad_box(x1, y1, x2, y2, w, h)
            pick = (x1, y1, x2, y2, 'yellow_contour')
            break

    if not pick:
        return result

    x1, y1, x2, y2, method = pick
    if (x2 - x1) * (y2 - y1) < 0.04 * h * w:
        return result

    crop_path, cw, ch = _write_crop(img, x1, y1, x2, y2)
    if not crop_path:
        return result

    result.found = True
    result.method = method
    result.bbox = _norm_bbox(x1, y1, x2, y2, w, h)
    result.crop_path = crop_path
    result.cleanup_path = crop_path
    result.crop_width = cw
    result.crop_height = ch
    return result


def attach_localization_debug(payload: dict, loc: SignLocalizationResult, *, yolo_raw: dict | None = None) -> dict:
    """Merge localization + optional YOLO debug fields into API payload."""
    debug = loc.to_debug_dict()
    if yolo_raw:
        debug['yolo_class_key'] = yolo_raw.get('class_key') or ''
        debug['yolo_class_id'] = yolo_raw.get('class_id')
        debug['yolo_confidence'] = yolo_raw.get('confidence')
    payload = dict(payload)
    payload['localization_debug'] = debug
    payload['sign_bbox'] = loc.bbox
    if loc.crop_width and loc.crop_height:
        payload['crop_size'] = f'{loc.crop_width}x{loc.crop_height}'
    return payload
