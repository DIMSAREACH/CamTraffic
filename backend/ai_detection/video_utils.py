"""Extract sample frames from uploaded video for AI detection."""
from __future__ import annotations

import logging
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

ALLOWED_VIDEO_EXTENSIONS = {'.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'}


def extract_video_frames(video_path: str, max_frames: int = 6) -> list[tuple[str, float]]:
    """
    Sample evenly spaced frames from a video file.
    Returns list of (temp_jpeg_path, timestamp_seconds).
    Caller must delete temp files when done.
    """
    try:
        import cv2
    except ImportError as exc:
        raise ValueError('OpenCV is required for video detection') from exc

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError('Could not open video file')

    try:
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
        if total_frames <= 0:
            total_frames = 1
        if fps <= 0:
            fps = 25.0

        count = max(1, min(max_frames, total_frames))
        if count == 1:
            indices = [max(0, total_frames // 2)]
        else:
            step = max(1, total_frames // count)
            indices = [min(i * step, total_frames - 1) for i in range(count)]

        frames: list[tuple[str, float]] = []
        for frame_idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ok, frame = cap.read()
            if not ok or frame is None:
                continue
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
            tmp_path = tmp.name
            tmp.close()
            if not cv2.imwrite(tmp_path, frame):
                Path(tmp_path).unlink(missing_ok=True)
                continue
            timestamp = frame_idx / fps
            frames.append((tmp_path, timestamp))
        return frames
    finally:
        cap.release()
