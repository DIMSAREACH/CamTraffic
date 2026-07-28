"""Capture a single frame from a camera HTTP snapshot, RTSP stream, or local demo path/video."""
from __future__ import annotations

import logging
import shutil
import tempfile
import time
import urllib.request
from pathlib import Path

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

_VIDEO_SUFFIXES = {'.webm', '.mp4', '.avi', '.mov', '.mkv', '.m4v'}


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


def _is_video_path(path: Path | str) -> bool:
    return Path(str(path)).suffix.lower() in _VIDEO_SUFFIXES


def _sample_frame_from_video(source: str | Path, dest_jpeg: str) -> bool:
    """
    Grab one JPEG frame from a local/remote video.
    Rotates through the timeline so live detection sees different moments.
    """
    from .opencv_utils import grab_frame, open_video_capture, write_jpeg

    cap = open_video_capture(source, live=False)
    if not cap.isOpened():
        logger.warning('Video open failed: %s', source)
        return False

    try:
        import cv2

        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0) or 25.0
        if frame_count > 1:
            # Advance ~1s of wall clock per second of video so successive captures move
            idx = int(time.time() * max(1.0, fps * 0.35)) % frame_count
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)

        frame = grab_frame(cap, live=False)
        if frame is None and frame_count > 1:
            # Seek failed on some codecs — fall back to first readable frame
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            frame = grab_frame(cap, live=False)
        if frame is None:
            return False
        return write_jpeg(dest_jpeg, frame, enhance=True)
    finally:
        cap.release()


def capture_frame_from_url(
    url: str,
    *,
    camera_id: str | None = None,
    filename_hint: str = 'live-stream',
) -> tuple[str | None, str | None]:
    """
    Grab one JPEG from HTTP(S) snapshot, RTSP/RTSPS, local media path, or video file/URL.
    Returns (temp_jpeg_path, filename) or (None, None).
    """
    raw = (url or '').strip()
    if not raw:
        return None, None

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
    tmp_path = tmp.name
    tmp.close()
    safe_hint = ''.join(ch if ch.isalnum() or ch in '-_' else '-' for ch in filename_hint)[:48] or 'live'
    fname = f'webcam-street-{safe_hint}.jpg'

    from .stream_remote_client import capture_snapshot_via_gateway, stream_gateway_enabled

    if stream_gateway_enabled() and raw.lower().startswith(('rtsp://', 'rtsps://', 'http://', 'https://')):
        jpeg = capture_snapshot_via_gateway(str(camera_id or 'adhoc'), rtsp_url=raw)
        if jpeg:
            Path(tmp_path).write_bytes(jpeg)
            return tmp_path, fname

    try:
        local = resolve_local_frame_path(raw)
        if local is not None:
            if _is_video_path(local):
                if not _sample_frame_from_video(local, tmp_path):
                    Path(tmp_path).unlink(missing_ok=True)
                    return None, None
            else:
                shutil.copyfile(local, tmp_path)
            return tmp_path, fname

        fetch_url = _absolute_http_url(raw)
        if fetch_url.lower().startswith(('rtsp://', 'rtsps://')):
            from .opencv_utils import grab_frame, open_video_capture, write_jpeg

            cap = open_video_capture(fetch_url, live=True)
            if not cap.isOpened():
                logger.warning('RTSP open failed for url=%s', fetch_url[:120])
                Path(tmp_path).unlink(missing_ok=True)
                return None, None
            try:
                frame = grab_frame(cap, live=True)
            finally:
                cap.release()
            if frame is None:
                Path(tmp_path).unlink(missing_ok=True)
                return None, None
            if not write_jpeg(tmp_path, frame, enhance=True):
                Path(tmp_path).unlink(missing_ok=True)
                return None, None
            return tmp_path, fname

        path_no_q = fetch_url.split('?', 1)[0].lower()
        looks_like_video = (
            Path(path_no_q).suffix.lower() in _VIDEO_SUFFIXES
            or '/videos/' in path_no_q
            or '/preview/stock-footage' in path_no_q
            or path_no_q.endswith('/preview')
            or 'stock-footage' in path_no_q
        )
        if looks_like_video and fetch_url.lower().startswith(('http://', 'https://')):
            # Shutterstock / CDN preview URLs: sample a real video frame (not HTML).
            if _sample_frame_from_video(fetch_url, tmp_path):
                return tmp_path, fname
            logger.warning('Video frame sample failed for url=%s', fetch_url[:120])

        if Path(fetch_url.split('?', 1)[0]).suffix.lower() in _VIDEO_SUFFIXES:
            if not _sample_frame_from_video(fetch_url, tmp_path):
                Path(tmp_path).unlink(missing_ok=True)
                return None, None
            return tmp_path, fname

        if fetch_url.lower().startswith(('http://', 'https://')):
            # Private LAN CCTV often offline in local/thesis setups — fail fast.
            timeout = 3 if '192.168.' in fetch_url or '10.' in fetch_url else 15
            req = urllib.request.Request(fetch_url, headers={'User-Agent': 'CamTraffic/1.0'})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = resp.read()
                ctype = (resp.headers.get('Content-Type') or '').lower()
            if not data:
                Path(tmp_path).unlink(missing_ok=True)
                return None, None
            # Reject HTML pages mistaken for snapshots (causes bad detections).
            if 'text/html' in ctype or data[:15].lstrip().lower().startswith((b'<!doctype', b'<html')):
                Path(tmp_path).unlink(missing_ok=True)
                logger.warning('HTTP URL returned HTML, not an image/video: %s', fetch_url[:120])
                return None, None
            # Prefer OpenCV decode → optional dark enhance → rewrite JPEG.
            try:
                import numpy as np

                from .opencv_utils import write_jpeg

                arr = np.frombuffer(data, dtype=np.uint8)
                import cv2

                decoded = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                if decoded is not None and write_jpeg(tmp_path, decoded, enhance=True):
                    return tmp_path, fname
            except Exception:
                logger.debug('OpenCV enhance skipped for HTTP snapshot', exc_info=True)
            Path(tmp_path).write_bytes(data)
            return tmp_path, fname

        logger.warning('Unsupported stream url: %s', raw[:160])
        Path(tmp_path).unlink(missing_ok=True)
        return None, None
    except Exception:
        logger.exception('Frame capture failed for url=%s', raw[:160])
        Path(tmp_path).unlink(missing_ok=True)
        return None, None


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

    path, fname = capture_frame_from_url(
        url,
        camera_id=str(camera.id),
        filename_hint=f'camera-{camera.code or camera.id}',
    )
    if not path:
        return None, None

    camera.last_ping = timezone.now()
    camera.save(update_fields=['last_ping'])
    return path, fname
