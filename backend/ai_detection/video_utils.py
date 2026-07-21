"""Extract sample frames from uploaded video for AI detection."""
from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

ALLOWED_VIDEO_EXTENSIONS = {'.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'}

# Keep in sync with frontend VideoUploadPanel MAX_VIDEO_MB (default 500).
MAX_VIDEO_UPLOAD_MB = max(1, int(os.getenv('AI_VIDEO_MAX_MB', '500')))
MAX_VIDEO_UPLOAD_BYTES = MAX_VIDEO_UPLOAD_MB * 1024 * 1024


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


def build_annotated_preview_video(frame_paths: list[str], out_path: str, *, fps: float = 2.0) -> bool:
    """
    Stitch sampled annotated JPEGs into a short MP4 preview (each frame ~1s at default fps).
    Returns True when out_path was written.
    """
    if not frame_paths:
        return False
    try:
        import cv2
    except ImportError as exc:
        raise ValueError('OpenCV is required for annotated video preview') from exc

    images: list = []
    size: tuple[int, int] | None = None
    for path in frame_paths:
        img = cv2.imread(path)
        if img is None:
            continue
        h, w = img.shape[:2]
        if size is None:
            size = (w, h)
        elif (w, h) != size:
            img = cv2.resize(img, size)
        images.append(img)
    if not images or size is None:
        return False

    hold = max(1, int(round(fps)))
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(out_path, fourcc, fps, size)
    if not writer.isOpened():
        return False
    try:
        for img in images:
            for _ in range(hold):
                writer.write(img)
        return True
    finally:
        writer.release()
