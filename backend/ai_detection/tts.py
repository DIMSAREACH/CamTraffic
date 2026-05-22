"""Khmer text-to-speech via Microsoft Edge online voices (edge-tts, free, no API key)."""
from __future__ import annotations

import asyncio
import io
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_VOICE = 'km-KH-SreymomNeural'
MAX_CHARS = 3000


async def _stream_to_bytes(text: str, voice: str) -> bytes:
    import edge_tts

    communicate = edge_tts.Communicate(text, voice=voice)
    buf = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk['type'] == 'audio':
            buf.write(chunk['data'])
    data = buf.getvalue()
    if not data:
        raise RuntimeError('TTS returned empty audio')
    return data


def synthesize_khmer(text: str) -> bytes:
    """Return MP3 bytes for Khmer (or other) text."""
    cleaned = (text or '').strip()
    if not cleaned:
        raise ValueError('Empty text')
    if len(cleaned) > MAX_CHARS:
        raise ValueError(f'Text too long (max {MAX_CHARS} characters)')

    voice = getattr(settings, 'TTS_VOICE', DEFAULT_VOICE)
    return asyncio.run(_stream_to_bytes(cleaned, voice))


def tts_available() -> bool:
    if not getattr(settings, 'TTS_ENABLED', True):
        return False
    try:
        import edge_tts  # noqa: F401
        return True
    except ImportError:
        return False
