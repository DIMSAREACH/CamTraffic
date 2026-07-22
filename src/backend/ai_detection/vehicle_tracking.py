"""
ByteTrack vehicle tracking via Ultralytics YOLO track mode.

Maintains per-session YOLO instances so track IDs persist across live webcam frames.
"""
from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

from django.conf import settings

from .vehicle_detection import (
    COCO_VEHICLE_CLASSES,
    _build_detection,
    _confidence_threshold,
    _resolve_vehicle_model_path,
    vehicle_detection_enabled,
)

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_sessions: dict[str, '_TrackSession'] = {}


@dataclass
class _TrackSession:
    model: object
    last_used: float = field(default_factory=time.time)


def vehicle_tracking_enabled() -> bool:
    return vehicle_detection_enabled() and getattr(settings, 'AI_VEHICLE_TRACKING_ENABLED', True)


def _session_ttl() -> int:
    return int(getattr(settings, 'AI_VEHICLE_TRACK_SESSION_TTL', 300))


def _max_sessions() -> int:
    return int(getattr(settings, 'AI_VEHICLE_TRACK_MAX_SESSIONS', 12))


def _create_track_model():
    from ultralytics import YOLO

    path = _resolve_vehicle_model_path()
    return YOLO(str(path))


def _purge_stale_sessions(now: float | None = None) -> None:
    now = now or time.time()
    ttl = _session_ttl()
    stale = [sid for sid, sess in _sessions.items() if now - sess.last_used > ttl]
    for sid in stale:
        _sessions.pop(sid, None)


def _evict_if_needed() -> None:
    max_sessions = _max_sessions()
    if len(_sessions) <= max_sessions:
        return
    ordered = sorted(_sessions.items(), key=lambda item: item[1].last_used)
    for sid, _ in ordered[: len(_sessions) - max_sessions]:
        _sessions.pop(sid, None)


def _get_session_model(session_id: str):
    session_id = (session_id or '').strip()
    if not session_id:
        raise ValueError('track_session is required for vehicle tracking')

    now = time.time()
    with _lock:
        _purge_stale_sessions(now)
        sess = _sessions.get(session_id)
        if sess is None:
            _evict_if_needed()
            sess = _TrackSession(model=_create_track_model())
            _sessions[session_id] = sess
        sess.last_used = now
        return sess.model


def reset_track_session(session_id: str) -> None:
    """Drop tracker state for a session (e.g. when camera stops)."""
    session_id = (session_id or '').strip()
    if not session_id:
        return
    with _lock:
        _sessions.pop(session_id, None)


def track_vehicles(image_path: str, session_id: str) -> list[dict]:
    """
    Detect and track vehicles with ByteTrack. Returns detections with optional track_id.
    """
    if not vehicle_tracking_enabled():
        return []

    path = Path(image_path)
    if not path.is_file():
        logger.warning('Vehicle tracking skipped — file not found: %s', image_path)
        return []

    try:
        model = _get_session_model(session_id)
        threshold = _confidence_threshold()
        results = model.track(
            source=str(path),
            conf=threshold,
            verbose=False,
            persist=True,
            classes=list(COCO_VEHICLE_CLASSES.keys()),
            tracker='bytetrack.yaml',
        )
        if not results:
            return []

        result = results[0]
        boxes = result.boxes
        if boxes is None or len(boxes) == 0:
            return []

        img_h, img_w = (float(v) for v in result.orig_shape[:2])
        detections: list[dict] = []
        for box in boxes:
            cls_idx = int(box.cls.item())
            conf = float(box.conf.item())
            xyxy = box.xyxy[0].tolist()
            item = _build_detection(cls_idx, conf, xyxy, img_w, img_h)
            if not item:
                continue
            track_id = None
            if box.id is not None:
                try:
                    track_id = int(box.id.item())
                except (TypeError, ValueError):
                    track_id = None
            if track_id is not None:
                item['track_id'] = track_id
            detections.append(item)

        detections.sort(key=lambda d: (d.get('track_id') is None, -d['confidence']))
        return detections
    except Exception:
        logger.exception('Vehicle tracking failed for %s (session=%s)', image_path, session_id)
        return []
