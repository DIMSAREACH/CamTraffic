"""Relative media URLs for SPA clients (Vite /media proxy or same-origin deploy)."""
from __future__ import annotations

import logging
import os
import shutil
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

from django.conf import settings

logger = logging.getLogger(__name__)

# Negative cache: missing R2/S3 keys must not block API list endpoints for seconds each.
_missing_remote_lock = threading.Lock()
_missing_remote: dict[str, float] = {}
_MISSING_TTL_SEC = 600.0
_MISSING_MAX = 4000


def _remember_missing(name: str) -> None:
    now = time.monotonic()
    with _missing_remote_lock:
        if len(_missing_remote) >= _MISSING_MAX:
            ordered = sorted(_missing_remote.items(), key=lambda kv: kv[1])
            for key, _ in ordered[: _MISSING_MAX // 2]:
                _missing_remote.pop(key, None)
        _missing_remote[name] = now


def _is_known_missing(name: str) -> bool:
    now = time.monotonic()
    with _missing_remote_lock:
        ts = _missing_remote.get(name)
        if ts is None:
            return False
        if now - ts > _MISSING_TTL_SEC:
            _missing_remote.pop(name, None)
            return False
        return True


def _hydrate_from_remote_enabled() -> bool:
    """Remote hydrate is expensive; off by default in DEBUG unless explicitly enabled."""
    raw = os.getenv('MEDIA_HYDRATE_FROM_S3', '').strip().lower()
    if raw in ('1', 'true', 'yes', 'on'):
        return True
    if raw in ('0', 'false', 'no', 'off'):
        return False
    # Production/S3: allow hydrate; local DEBUG: skip (avoid HeadObject storms on /ai/logs/).
    return bool(getattr(settings, 'USE_S3_MEDIA', False)) and not bool(
        getattr(settings, 'DEBUG', False)
    )


def _local_media_path(name: str) -> Path:
    return Path(settings.MEDIA_ROOT) / name.lstrip('/')


def _profile_local_fallback(name: str) -> str | None:
    """
    When Django saved profiles/foo_AbCdEfG.jpg but only profiles/foo.jpg exists locally
    (common after R2 sync / demo seed), return the existing sibling path.
    """
    clean = (name or '').lstrip('/').replace('\\', '/')
    if not clean.startswith('profiles/'):
        return None
    path = Path(clean)
    stem = path.stem
    if '_' not in stem:
        return None
    base, suffix = stem.rsplit('_', 1)
    # Django get_available_name suffix is typically 7 alnum chars.
    if not (4 <= len(suffix) <= 10 and suffix.isalnum()):
        return None
    candidate = f'{path.parent.as_posix()}/{base}{path.suffix}'.lstrip('./')
    if _local_media_path(candidate).is_file():
        return candidate
    return None


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


def hydrate_local_media_from_storage(field, *, force: bool = False) -> Path | None:
    """Download a remote storage object into MEDIA_ROOT when the local copy is missing.

    Set force=True for small list endpoints (e.g. vehicle registration photos) where
    on-demand hydrate is cheap and DEBUG would otherwise skip it.
    """
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
    if not force and not _hydrate_from_remote_enabled():
        return None
    if _is_known_missing(name):
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
            _remember_missing(name)
            return None
        return ensure_local_media_copy(name, content=data)
    except FileNotFoundError:
        _remember_missing(name)
        logger.debug('Remote media missing (cached): %s', name)
        return None
    except Exception as exc:
        msg = str(exc).lower()
        if '404' in msg or 'not found' in msg or 'does not exist' in msg:
            _remember_missing(name)
            logger.debug('Remote media not found (cached): %s', name)
        else:
            logger.warning('Could not hydrate local media for %s: %s', name, exc)
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
        # Missing hashed profile upload → use base sibling on disk (avoids Vite 404 spam).
        fallback = _profile_local_fallback(name)
        if fallback:
            return _public_media_path(fallback)
    except OSError:
        pass

    # Dev hybrid: pull S3/R2 into MEDIA_ROOT. Skipped in DEBUG by default so
    # /api/ai/logs/?page_size=200 does not stall on missing HeadObject calls.
    if getattr(settings, 'USE_S3_MEDIA', False) and _hydrate_from_remote_enabled():
        hydrated = hydrate_local_media_from_storage(field)
        if hydrated is not None and hydrated.is_file():
            return _public_media_path(name)

    # Local storage only: expose /media/... when the file is expected under MEDIA_ROOT.
    if not getattr(settings, 'USE_S3_MEDIA', False):
        return _public_media_path(name)

    # DEBUG + S3 without hydrate: never emit /media/... for missing local copies
    # (Vite proxy 404 spam). Orphaned R2 keys would also 404 if we returned field.url.
    # Callers that need remote files should enable MEDIA_HYDRATE_FROM_S3=1.
    if getattr(settings, 'DEBUG', False):
        return ''

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
