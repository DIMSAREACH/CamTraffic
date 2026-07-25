"""Relative media URLs for SPA clients (Vite /media proxy or same-origin deploy)."""
from __future__ import annotations

import logging
import shutil
from pathlib import Path
from urllib.parse import urlparse

from django.conf import settings

logger = logging.getLogger(__name__)


def _local_media_path(name: str) -> Path:
    return Path(settings.MEDIA_ROOT) / name.lstrip('/')


def _public_media_path(name: str) -> str:
    """Always the SPA/Vite-friendly /media/... path (never an absolute R2 host)."""
    return f"/media/{name.lstrip('/')}"


def ensure_local_media_copy(
    name: str,
    *,
    source_path: str | Path | None = None,
    content: bytes | None = None,
) -> Path | None:
    """
    Ensure MEDIA_ROOT has a copy of the storage object so Vite `/media` proxy works
    when USE_S3_MEDIA=True (files land in R2 first, not on local disk).
    """
    if not name:
        return None
    dest = _local_media_path(name)
    try:
        if dest.is_file() and dest.stat().st_size > 0:
            return dest
        dest.parent.mkdir(parents=True, exist_ok=True)
        if source_path is not None:
            src = Path(source_path)
            if src.is_file():
                shutil.copyfile(src, dest)
                return dest
        if content:
            dest.write_bytes(content)
            return dest
    except OSError:
        logger.exception('Failed to mirror media locally: %s', name)
    return dest if dest.is_file() else None


def hydrate_local_media_from_storage(field) -> Path | None:
    """Download a remote storage object into MEDIA_ROOT when the local copy is missing."""
    name = getattr(field, 'name', None)
    if not name:
        return None
    dest = _local_media_path(name)
    try:
        if dest.is_file() and dest.stat().st_size > 0:
            return dest
    except OSError:
        pass

    if not getattr(settings, 'USE_S3_MEDIA', False):
        return None

    try:
        field.open('rb')
        try:
            data = field.read()
        finally:
            try:
                field.close()
            except Exception:
                pass
        if not data:
            return None
        return ensure_local_media_copy(name, content=data)
    except Exception:
        logger.warning('Could not hydrate local media for %s', name, exc_info=True)
        return None


def api_media_url(_request, field) -> str:
    """Return a browser-loadable media URL.

    Prefer `/media/...` so Vite (and nginx) can proxy to Django. Absolute R2
    public URLs are only returned when the object is not available locally and
    USE_S3_MEDIA is enabled — callers must still handle private/403 buckets.
    """
    if not field:
        return ''
    name = getattr(field, 'name', None)
    if not name:
        return ''

    # Always prefer local disk when the file exists — works with USE_S3_MEDIA=True
    # hybrids where public R2 URLs are 403 but MEDIA_ROOT has a copy.
    try:
        if _local_media_path(name).is_file():
            path = _public_media_path(name)
            public_base = (getattr(settings, 'PUBLIC_API_URL', None) or '').strip().rstrip('/')
            if public_base and not getattr(settings, 'DEBUG', False):
                return f'{public_base}{path}'
            if _request is not None and not getattr(settings, 'DEBUG', False):
                try:
                    return _request.build_absolute_uri(path)
                except Exception:
                    return path
            return path
    except OSError:
        pass

    # Dev hybrid: pull S3/R2 object into MEDIA_ROOT so /media proxy succeeds.
    if getattr(settings, 'USE_S3_MEDIA', False):
        hydrated = hydrate_local_media_from_storage(field)
        if hydrated is not None and hydrated.is_file():
            return _public_media_path(name)

    # Local/dev SPA: keep /media proxy path (may 404 until hydrated).
    if getattr(settings, 'DEBUG', False) or not getattr(settings, 'USE_S3_MEDIA', False):
        return _public_media_path(name)

    try:
        url = field.url
    except (ValueError, AttributeError):
        return _public_media_path(name)

    # django-storages / custom domains already return a full public URL.
    if url.startswith(('http://', 'https://')):
        if getattr(settings, 'USE_S3_MEDIA', False):
            return url
        path = urlparse(url).path or url
    else:
        path = url

    # Normalize accidental absolute MEDIA_URL hosts down to /media/... for local proxy.
    if path.startswith('http://') or path.startswith('https://'):
        path = urlparse(path).path or path

    if not path.startswith('/'):
        path = _public_media_path(name)
    elif not path.startswith('/media/'):
        # e.g. storage returned /signs/...
        path = _public_media_path(path.lstrip('/'))

    public_base = (getattr(settings, 'PUBLIC_API_URL', None) or '').strip().rstrip('/')
    if public_base:
        return f'{public_base}{path}'
    if _request is not None and not getattr(settings, 'DEBUG', False):
        try:
            return _request.build_absolute_uri(path)
        except Exception:
            return path
    return path


def api_media_path(relative_name: str) -> str:
    """Build a browser URL from a storage-relative path."""
    if not relative_name:
        return ''
    name = relative_name.lstrip('/')
    # Strip leading media/ if storage already prefixes location.
    if name.startswith('media/'):
        name = name[len('media/'):]

    local = _local_media_path(name)
    try:
        if local.is_file():
            return _public_media_path(name)
    except OSError:
        pass

    if getattr(settings, 'USE_S3_MEDIA', False):
        domain = (getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', None) or '').strip()
        location = (getattr(settings, 'AWS_LOCATION', 'media') or 'media').strip()
        if domain:
            return f'https://{domain}/{location}/{name}'

    return _public_media_path(name)
