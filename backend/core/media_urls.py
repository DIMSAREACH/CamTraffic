"""Relative media URLs for SPA clients (Vite /media proxy or same-origin deploy)."""
from __future__ import annotations

from urllib.parse import urlparse

from django.conf import settings


def api_media_url(_request, field) -> str:
    """Return a browser-loadable media URL.

    - Local disk: absolute API URL when PUBLIC_API_URL is set, else /media/...
    - Cloud (S3/R2): full https URL from storage (do not rewrite onto the API host).
    """
    if not field:
        return ''
    name = getattr(field, 'name', None)
    if not name:
        return ''
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
    if not path.startswith('/'):
        media = settings.MEDIA_URL.rstrip('/')
        path = f'{media}/{name.lstrip("/")}'
    public_base = (getattr(settings, 'PUBLIC_API_URL', None) or '').strip().rstrip('/')
    if public_base:
        return f'{public_base}{path}'
    if _request is not None:
        return _request.build_absolute_uri(path)
    return path


def api_media_path(relative_name: str) -> str:
    """Build /media/... from a storage-relative path."""
    if not relative_name:
        return ''
    media = settings.MEDIA_URL.rstrip('/')
    return f'{media}/{relative_name.lstrip("/")}'
