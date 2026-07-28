"""Shared OpenCV helpers for RTSP/video capture and live-frame enhance."""
from __future__ import annotations

import logging
from pathlib import Path

import cv2
import numpy as np
from django.conf import settings

logger = logging.getLogger(__name__)


def capture_max_side() -> int:
    return max(640, int(getattr(settings, 'AI_CAPTURE_MAX_SIDE', 1920)))


def capture_enhance_enabled() -> bool:
    return bool(getattr(settings, 'AI_CAPTURE_ENHANCE', True))


def open_video_capture(source: str | Path, *, live: bool = False) -> cv2.VideoCapture:
    """
    Open a file path, HTTP video URL, or RTSP stream.
    Prefer FFMPEG backend; fall back to default. Live streams use a tiny buffer.
    """
    src = str(source)
    cap = cv2.VideoCapture(src, cv2.CAP_FFMPEG)
    if not cap.isOpened():
        cap.release()
        cap = cv2.VideoCapture(src)
    if live and cap.isOpened():
        try:
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        except Exception:
            pass
    return cap


def enhance_dark_bgr(frame: np.ndarray) -> np.ndarray:
    """
    CLAHE contrast boost when the frame is dark (night / underexposed CCTV).
    Bright frames are returned unchanged.
    """
    if frame is None or frame.size == 0:
        return frame
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    mean = float(np.mean(gray))
    if mean >= 88.0:
        return frame
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)
    clip = 3.8 if mean < 45.0 else 2.6
    clahe = cv2.createCLAHE(clipLimit=clip, tileGridSize=(8, 8))
    enhanced = cv2.cvtColor(
        cv2.merge([clahe.apply(l_ch), a_ch, b_ch]),
        cv2.COLOR_LAB2BGR,
    )
    # Mild denoise so night grain does not dominate YOLO
    if mean < 55.0:
        enhanced = cv2.GaussianBlur(enhanced, (3, 3), 0)
    return enhanced


def resize_max_side(frame: np.ndarray, max_side: int | None = None) -> np.ndarray:
    max_side = max_side or capture_max_side()
    h, w = frame.shape[:2]
    longest = max(h, w)
    if longest <= max_side:
        return frame
    scale = max_side / float(longest)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    return cv2.resize(frame, (nw, nh), interpolation=cv2.INTER_AREA)


def write_jpeg(
    path: str | Path,
    frame: np.ndarray,
    *,
    enhance: bool | None = None,
    quality: int = 92,
) -> bool:
    """Optionally enhance + downscale, then write JPEG."""
    if frame is None or frame.size == 0:
        return False
    out = frame
    if enhance is None:
        enhance = capture_enhance_enabled()
    if enhance:
        out = enhance_dark_bgr(out)
    out = resize_max_side(out)
    return bool(
        cv2.imwrite(
            str(path),
            out,
            [int(cv2.IMWRITE_JPEG_QUALITY), int(quality)],
        )
    )


def grab_frame(
    cap: cv2.VideoCapture,
    *,
    live: bool = False,
    warmup: int | None = None,
) -> np.ndarray | None:
    """
    Read one usable BGR frame. For live/RTSP, discard buffered stale frames first.
    """
    if not cap.isOpened():
        return None
    if live:
        n = warmup if warmup is not None else int(getattr(settings, 'AI_RTSP_WARMUP_FRAMES', 4))
        n = max(1, min(12, n))
        best: np.ndarray | None = None
        for _ in range(n):
            ok, frame = cap.read()
            if ok and frame is not None and getattr(frame, 'size', 0) > 0:
                best = frame
        return best

    ok, frame = cap.read()
    if ok and frame is not None and getattr(frame, 'size', 0) > 0:
        return frame
    return None
