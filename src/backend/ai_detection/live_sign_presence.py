"""
OpenCV checks that a live webcam crop actually contains a traffic sign.

Rejects faces, blank walls, and weak histogram false positives before catalog/YOLO.
"""
from __future__ import annotations

import logging

import cv2
import numpy as np
from django.conf import settings

logger = logging.getLogger(__name__)


def _read_bgr(image_path: str):
    try:
        return cv2.imread(str(image_path))
    except OSError:
        return None


def analyze_live_sign_presence(image_path: str) -> dict:
    """
    Return presence metrics for a live webcam crop.
    Keys: present, sign_color_ratio, skin_ratio, sign_blob_ratio, edge_density
    """
    img = _read_bgr(image_path)
    if img is None:
        return {
            'present': False,
            'sign_color_ratio': 0.0,
            'skin_ratio': 0.0,
            'sign_blob_ratio': 0.0,
            'edge_density': 0.0,
        }

    h, w = img.shape[:2]
    if h < 48 or w < 48:
        return {
            'present': False,
            'sign_color_ratio': 0.0,
            'skin_ratio': 0.0,
            'sign_blob_ratio': 0.0,
            'edge_density': 0.0,
        }

    area_total = float(h * w)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    skin = cv2.inRange(hsv, np.array([0, 28, 50]), np.array([22, 190, 255]))
    skin |= cv2.inRange(hsv, np.array([0, 15, 40]), np.array([18, 160, 230]))
    skin_ratio = float(np.mean(skin > 0))

    red = cv2.inRange(hsv, np.array([0, 70, 70]), np.array([12, 255, 255]))
    red |= cv2.inRange(hsv, np.array([165, 70, 70]), np.array([180, 255, 255]))
    yellow = cv2.inRange(hsv, np.array([14, 70, 70]), np.array([42, 255, 255]))
    blue = cv2.inRange(hsv, np.array([88, 45, 45]), np.array([132, 255, 255]))
    sign_mask = cv2.bitwise_or(cv2.bitwise_or(red, yellow), blue)
    sign_mask = cv2.morphologyEx(sign_mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    sign_color_ratio = float(np.count_nonzero(sign_mask)) / area_total

    sign_blob_ratio = 0.0
    contours, _ = cv2.findContours(sign_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for cnt in sorted(contours, key=cv2.contourArea, reverse=True)[:6]:
        blob_area = cv2.contourArea(cnt)
        ratio = blob_area / area_total
        if ratio < 0.025:
            continue
        x, y, bw, bh = cv2.boundingRect(cnt)
        aspect = bw / max(bh, 1)
        if 0.35 <= aspect <= 2.8:
            sign_blob_ratio = max(sign_blob_ratio, ratio)
            break

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 70, 170)
    edge_density = float(np.count_nonzero(edges)) / area_total

    light_bg = float(np.mean(gray >= 210))
    cx0, cy0 = int(w * 0.2), int(h * 0.2)
    cx1, cy1 = int(w * 0.8), int(h * 0.8)
    center_hsv = hsv[cy0:cy1, cx0:cx1]
    center_mask = sign_mask[cy0:cy1, cx0:cx1]
    center_color_ratio = float(np.count_nonzero(center_mask)) / max((cx1 - cx0) * (cy1 - cy0), 1)
    center_skin = cv2.inRange(center_hsv, np.array([0, 28, 50]), np.array([22, 190, 255]))
    center_skin |= cv2.inRange(center_hsv, np.array([0, 15, 40]), np.array([18, 160, 230]))
    center_skin_ratio = float(np.mean(center_skin > 0))

    min_sign_color = float(getattr(settings, 'AI_LIVE_SIGN_COLOR_MIN', 0.05))
    min_blob = float(getattr(settings, 'AI_LIVE_SIGN_BLOB_MIN', 0.025))
    max_skin = float(getattr(settings, 'AI_LIVE_SKIN_MAX', 0.38))
    min_edge = float(getattr(settings, 'AI_LIVE_EDGE_MIN', 0.008))

    strong_sign = sign_blob_ratio >= 0.10 and sign_color_ratio >= min_sign_color * 0.75
    has_sign_colors = sign_color_ratio >= min_sign_color and sign_blob_ratio >= min_blob
    has_structure = (
        edge_density >= min_edge
        or sign_blob_ratio >= 0.08
        or sign_color_ratio >= 0.18
    )
    # Printed sign on white paper: colors sit in the center even when margins dominate.
    looks_like_print = (
        light_bg >= 0.35
        and center_color_ratio >= min_sign_color * 0.85
        and center_skin_ratio < 0.20
        and sign_blob_ratio >= min_blob
        and edge_density >= min_edge * 0.75
        and skin_ratio < max_skin
    )
    # Reject bare faces — require high skin with no compact sign-colored blob.
    looks_like_face = (
        skin_ratio >= max_skin
        and sign_blob_ratio < 0.08
        and sign_color_ratio < max(min_sign_color * 2.5, 0.32)
    )

    present = bool(
        (strong_sign or (has_sign_colors and has_structure) or looks_like_print)
        and not looks_like_face
    )
    return {
        'present': present,
        'sign_color_ratio': round(sign_color_ratio, 4),
        'skin_ratio': round(skin_ratio, 4),
        'sign_blob_ratio': round(sign_blob_ratio, 4),
        'edge_density': round(edge_density, 4),
    }


def live_sign_present(image_path: str) -> bool:
    return bool(analyze_live_sign_presence(image_path).get('present'))


def live_no_sign_result() -> dict:
    return {
        'sign_name': 'មិនមានស្លាក',
        'sign_name_en': 'No sign detected',
        'sign_name_km': 'មិនមានស្លាក',
        'description': 'មិនឃើញស្លាកចរាចរណ៍ក្នុងប្រអប់ណាត់។ សូមដាក់ស្លាកឱ្យនៅកណ្តាលប្រអប់។',
        'description_en': 'No traffic sign in the guide box. Center a sign in the dashed frame.',
        'guidance': 'រក្សាស្លាកឱ្យច្បាស់ និងពេញប្រអប់ រួញចុច Scan This Frame ឬ Start Auto-Scan។',
        'guidance_en': 'Hold the sign steady inside the frame, then tap Scan Frame or Scan & Save.',
        'confidence': 0.0,
        'class_key': '',
        'sign_code': '',
        'detection_engine': 'opencv',
        'sign_present': False,
        'detection_mode': 'no_sign',
    }
