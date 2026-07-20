"""Capture a single frame from a camera HTTP snapshot or RTSP stream."""
from __future__ import annotations

import logging
import tempfile
import urllib.request
from pathlib import Path

from django.utils import timezone

logger = logging.getLogger(__name__)


def capture_camera_frame(camera_id) -> tuple[str | None, str | None]:
    """
    Grab one frame for camera_id. Returns (temp_jpeg_path, filename) or (None, None).
    Updates camera.last_ping on success.
    """
    from infrastructure.models import Camera

    camera = Camera.objects.filter(pk=camera_id).first()
    if not camera:
        return None, None

    url = (camera.frame_source_url or '').strip()
    if not url:
        return None, None

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
    tmp_path = tmp.name
    tmp.close()
    fname = f'camera_{camera.code or camera.id}.jpg'

    from .stream_remote_client import capture_snapshot_via_gateway, stream_gateway_enabled

    if stream_gateway_enabled():
        jpeg = capture_snapshot_via_gateway(str(camera_id), rtsp_url=url)
        if jpeg:
            Path(tmp_path).write_bytes(jpeg)
            camera.last_ping = timezone.now()
            camera.save(update_fields=['last_ping'])
            return tmp_path, fname

    try:
        if url.lower().startswith(('rtsp://', 'rtsps://')):
            import cv2

            cap = cv2.VideoCapture(url)
            if not cap.isOpened():
                logger.warning('RTSP open failed for camera %s', camera_id)
                Path(tmp_path).unlink(missing_ok=True)
                return None, None
            ok, frame = cap.read()
            cap.release()
            if not ok or frame is None:
                Path(tmp_path).unlink(missing_ok=True)
                return None, None
            import cv2 as cv

            cv.imwrite(tmp_path, frame)
        else:
            req = urllib.request.Request(url, headers={'User-Agent': 'CamTraffic/1.0'})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
            if not data:
                Path(tmp_path).unlink(missing_ok=True)
                return None, None
            Path(tmp_path).write_bytes(data)

        camera.last_ping = timezone.now()
        camera.save(update_fields=['last_ping'])
        return tmp_path, fname
    except Exception:
        logger.exception('Frame capture failed for camera %s', camera_id)
        Path(tmp_path).unlink(missing_ok=True)
        return None, None
