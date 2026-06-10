"""Khmer text-to-speech via Microsoft Edge online voices (edge-tts, free, no API key)."""
from __future__ import annotations

import asyncio
import io
import logging
import os
import ssl

from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_VOICE = 'km-KH-SreymomNeural'
VOICES = {
    'km': 'km-KH-SreymomNeural',
    'en': 'en-US-JennyNeural',
}
MAX_CHARS = 3000


def _ssl_verify_enabled() -> bool:
    return os.getenv('TTS_SSL_VERIFY', 'true').lower() not in ('0', 'false', 'no')


def _patch_edge_tts_ssl(verify: bool) -> None:
    """edge-tts uses its own _SSL_CTX for websockets — patch it for Windows CA issues."""
    import edge_tts.communicate as comm

    if not verify:
        comm._SSL_CTX = False
        return
    try:
        import certifi

        comm._SSL_CTX = ssl.create_default_context(cafile=certifi.where())
    except Exception as exc:
        logger.warning('Could not load certifi CA bundle (%s); disabling SSL verify for TTS', exc)
        comm._SSL_CTX = False


def _aiohttp_ssl_connector(verify: bool):
    import aiohttp

    if not verify:
        return aiohttp.TCPConnector(ssl=False)
    try:
        import certifi

        ctx = ssl.create_default_context(cafile=certifi.where())
        return aiohttp.TCPConnector(ssl=ctx)
    except Exception:
        return aiohttp.TCPConnector(ssl=False)


async def _stream_to_bytes(text: str, voice: str) -> bytes:
    import aiohttp
    import edge_tts

    verify = _ssl_verify_enabled()
    attempts = [verify] if verify else [False]
    if verify:
        attempts.append(False)

    last_error: Exception | None = None
    for use_verify in attempts:
        connector = _aiohttp_ssl_connector(use_verify)
        _patch_edge_tts_ssl(use_verify)
        communicate = edge_tts.Communicate(text, voice=voice, connector=connector)
        buf = io.BytesIO()
        try:
            async for chunk in communicate.stream():
                if chunk['type'] == 'audio':
                    buf.write(chunk['data'])
            data = buf.getvalue()
            if not data:
                raise RuntimeError('TTS returned empty audio')
            if not use_verify and verify:
                logger.warning('TTS connected without SSL certificate verification')
            return data
        except aiohttp.ClientConnectorCertificateError as exc:
            last_error = exc
            logger.warning('TTS SSL error (verify=%s): %s', use_verify, exc)
        finally:
            await connector.close()

    if last_error:
        raise last_error
    raise RuntimeError('TTS failed')


def synthesize_speech(text: str, lang: str = 'km') -> bytes:
    """Return MP3 bytes for Khmer or English text."""
    cleaned = (text or '').strip()
    if not cleaned:
        raise ValueError('Empty text')
    if len(cleaned) > MAX_CHARS:
        raise ValueError(f'Text too long (max {MAX_CHARS} characters)')

    lang_key = (lang or 'km').lower()[:2]
    voice = VOICES.get(lang_key) or getattr(settings, 'TTS_VOICE', DEFAULT_VOICE)
    return asyncio.run(_stream_to_bytes(cleaned, voice))


def synthesize_khmer(text: str) -> bytes:
    """Return MP3 bytes for Khmer text."""
    return synthesize_speech(text, 'km')


def tts_available() -> bool:
    if not getattr(settings, 'TTS_ENABLED', True):
        return False
    try:
        import edge_tts  # noqa: F401
        return True
    except ImportError:
        return False
