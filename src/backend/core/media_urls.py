"""Relative media URLs for SPA clients (Vite /media proxy or same-origin deploy)."""
from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

from django.conf import settings


def _local_media_path(name: str) -> Path:
    return Path(settings.MEDIA_ROOT) / name.lstrip('/')


def _public_media_path(name: str) -> str:
    """Always the SPA/Vite-friendly /media/... path (never an absolute R2 host)."""
    return f"/media/{name.lstrip('/')}"


def api_media_url(_request, field) -> str:
    """Return a browser-loadable media URL.

    - Local disk / DEBUG hybrid: prefer `/media/...` so Vite can proxy to Django.
    - Cloud (S3/R2) only: full https URL from storage when the object is not on disk.
    """
    if not field:
        return ''
    name = getattr(field, 'name', None)
    if not name:
        return ''

    # Dev / hybrid: files still on disk → serve via /media (Vite proxy), even if R2 is enabled.
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

    try:
        url = field.url
    except (ValueError, AttributeError):
        return ''

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
