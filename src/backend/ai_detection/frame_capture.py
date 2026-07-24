"""Capture a single frame from a camera HTTP snapshot, RTSP stream, or local demo path."""
from __future__ import annotations

import logging
import shutil
import tempfile
import urllib.request
from pathlib import Path

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def _repo_root() -> Path:
    # BASE_DIR is src/backend → CamTraffic repo root
    return Path(getattr(settings, 'REPO_ROOT', Path(settings.BASE_DIR).resolve().parents[1]))


def resolve_local_frame_path(url: str) -> Path | None:
    """Map relative frame URLs to a file on disk (media or frontend public demos)."""
    raw = (url or '').strip()
    if not raw or raw.lower().startswith(('http://', 'https://', 'rtsp://', 'rtsps://')):
        return None

    candidates: list[Path] = []
    root = _repo_root()
    if raw.startswith('/media/'):
        candidates.append(Path(settings.MEDIA_ROOT) / raw[len('/media/'):])
    elif raw.startswith('media/'):
        candidates.append(Path(settings.MEDIA_ROOT) / raw[len('media/'):])
    elif raw.startswith('/demo-cameras/') or raw.startswith('demo-cameras/'):
        rel = raw.lstrip('/')
        candidates.extend([
            # Current portal public folders
            root / 'src' / 'web' / 'admin' / 'public' / rel,
            root / 'src' / 'web' / 'user' / 'public' / rel,
            # Legacy layout (older checkouts)
            root / 'frontend-admin' / 'public' / rel,
            root / 'frontend-user' / 'public' / rel,
            Path(settings.MEDIA_ROOT) / rel,
        ])
    elif raw.startswith('/cameras/') or raw.startswith('cameras/'):
        rel = raw.lstrip('/')
        candidates.append(Path(settings.MEDIA_ROOT) / rel)
    else:
        # Bare relative path under MEDIA_ROOT
        candidates.append(Path(settings.MEDIA_ROOT) / raw.lstrip('/'))

    for path in candidates:
        try:
            if path.is_file():
                return path
        except OSError:
            continue
    return None


def _absolute_http_url(url: str) -> str:
    """Turn /media/... into a fetchable URL using R2/public API base when configured."""
    raw = url.strip()
    if raw.lower().startswith(('http://', 'https://')):
        return raw
    if raw.startswith('/media/') or raw.startswith('media/'):
        path = raw if raw.startswith('/') else f'/{raw}'
        domain = (getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', None) or '').strip()
        if getattr(settings, 'USE_S3_MEDIA', False) and domain:
            return f'https://{domain}{path}'
        public = (getattr(settings, 'PUBLIC_API_URL', None) or '').strip().rstrip('/')
        if public:
            return f'{public}{path}'
    return raw


def capture_camera_frame(camera_id) -> tuple[str | None, str | None]:
    """
    Grab one frame for camera_id. Returns (temp_jpeg_path, filename) or (None, None).
    Updates camera.last_ping on success.
    """
    from infrastructure.models import Camera

    camera = Camera.objects.filter(pk=camera_id).first()
    if not camera:
        return None, None

    url = ''
    if hasattr(camera, 'effective_frame_url'):
        url = camera.effective_frame_url()
    else:
        url = (camera.frame_source_url or getattr(camera, 'rtsp_url', '') or '').strip()
    if not url:
        return None, None

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
    tmp_path = tmp.name
    tmp.close()
    # Prefix so DetectSignView treats this as live street capture (full_frame / live_scan)
    fname = f'webcam-street-camera-{camera.code or camera.id}.jpg'

    from .stream_remote_client import capture_snapshot_via_gateway, stream_gateway_enabled

    if stream_gateway_enabled() and url.lower().startswith(('rtsp://', 'rtsps://', 'http://', 'https://')):
        jpeg = capture_snapshot_via_gateway(str(camera_id), rtsp_url=url)
        if jpeg:
            Path(tmp_path).write_bytes(jpeg)
            camera.last_ping = timezone.now()
            camera.save(update_fields=['last_ping'])
            return tmp_path, fname

    try:
        local = resolve_local_frame_path(url)
        if local is not None:
            shutil.copyfile(local, tmp_path)
            camera.last_ping = timezone.now()
            camera.save(update_fields=['last_ping'])
            return tmp_path, fname

        fetch_url = _absolute_http_url(url)
        if fetch_url.lower().startswith(('rtsp://', 'rtsps://')):
            import cv2

            cap = cv2.VideoCapture(fetch_url)
            if not cap.isOpened():
                logger.warning('RTSP open failed for camera %s', camera_id)
                Path(tmp_path).unlink(missing_ok=True)
                return None, None
            ok, frame = cap.read()
            cap.release()
            if not ok or frame is None:
                Path(tmp_path).unlink(missing_ok=True)
                return None, None
            cv2.imwrite(tmp_path, frame)
        elif fetch_url.lower().startswith(('http://', 'https://')):
            req = urllib.request.Request(fetch_url, headers={'User-Agent': 'CamTraffic/1.0'})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = resp.read()
            if not data:
                Path(tmp_path).unlink(missing_ok=True)
                return None, None
            Path(tmp_path).write_bytes(data)
        else:
            logger.warning('Unsupported frame_source_url for camera %s: %s', camera_id, url)
            Path(tmp_path).unlink(missing_ok=True)
            return None, None

        camera.last_ping = timezone.now()
        camera.save(update_fields=['last_ping'])
        return tmp_path, fname
    except Exception:
        logger.exception('Frame capture failed for camera %s', camera_id)
        Path(tmp_path).unlink(missing_ok=True)
        return None, None
