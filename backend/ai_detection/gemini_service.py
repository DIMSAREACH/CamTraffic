"""
Gemini Vision fallback for traffic sign recognition.

Used when YOLO confidence is below AI_HYBRID_CONFIDENCE_THRESHOLD (default 70%).
"""
from __future__ import annotations

import base64
import json
import logging
import os
import re
import time
from pathlib import Path

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

AI_ROOT = Path(settings.BASE_DIR).parent / 'ai'
CATALOG_PATH = AI_ROOT / 'sign_catalog.json'
_CATALOG_CACHE: list[dict] | None = None
_GEMINI_BACKOFF_UNTIL = 0.0

# Common international sign names → catalog class_key
_SIGN_NAME_ALIASES: dict[str, str] = {
    'no entry': 'NO_ENTRY',
    'do not enter': 'NO_ENTRY',
    'entry prohibited': 'NO_ENTRY',
    'no left turn': 'NO_LEFT_TURN',
    'no right turn': 'NO_RIGHT_TURN',
    'no u turn': 'NO_U_TURN',
    'no parking': 'NO_PARKING',
    'no stopping': 'NO_STOPPING',
    'stop': 'STOP',
    'give way': 'GIVE_WAY',
    'yield': 'GIVE_WAY',
}


def _requests_verify():
    if os.getenv('GEMINI_SSL_VERIFY', 'true').lower() in ('0', 'false', 'no'):
        return False
    try:
        import certifi

        return certifi.where()
    except ImportError:
        return True


def _gemini_backoff_seconds() -> int:
    return int(getattr(settings, 'GEMINI_BACKOFF_SECONDS', 60))


def _gemini_request_timeout() -> int:
    return int(getattr(settings, 'GEMINI_REQUEST_TIMEOUT', 8))


def _mark_gemini_backoff(seconds: int | None = None) -> None:
    global _GEMINI_BACKOFF_UNTIL
    _GEMINI_BACKOFF_UNTIL = time.monotonic() + (seconds if seconds is not None else _gemini_backoff_seconds())


def gemini_available() -> bool:
    if not getattr(settings, 'GEMINI_ENABLED', True):
        return False
    if not getattr(settings, 'GEMINI_API_KEY', ''):
        return False
    return time.monotonic() >= _GEMINI_BACKOFF_UNTIL


def _load_catalog() -> list[dict]:
    global _CATALOG_CACHE
    if _CATALOG_CACHE is not None:
        return _CATALOG_CACHE
    if not CATALOG_PATH.is_file():
        _CATALOG_CACHE = []
        return _CATALOG_CACHE
    try:
        _CATALOG_CACHE = json.loads(CATALOG_PATH.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        logger.warning('Could not read sign catalog at %s', CATALOG_PATH)
        _CATALOG_CACHE = []
    return _CATALOG_CACHE


def _catalog_prompt_lines(max_rows: int = 40) -> str:
    lines = []
    for row in _load_catalog()[:max_rows]:
        code = row.get('sign_code') or ''
        name = row.get('sign_name_en') or row.get('sign_name') or ''
        key = row.get('class_key') or ''
        if code:
            lines.append(f'- {code} | {key} | {name}')
    return '\n'.join(lines)


def _guess_mime(path: Path) -> str:
    ext = path.suffix.lower()
    return {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
    }.get(ext, 'image/jpeg')


def _extract_json(text: str) -> dict | None:
    text = (text or '').strip()
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    fenced = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL | re.IGNORECASE)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except json.JSONDecodeError:
            pass
    brace = re.search(r'\{.*\}', text, re.DOTALL)
    if brace:
        try:
            return json.loads(brace.group(0))
        except json.JSONDecodeError:
            return None
    return None


def _row_by_class_key(class_key: str) -> dict | None:
    key_norm = re.sub(r'[^a-z0-9]+', '_', (class_key or '').lower()).strip('_')
    if not key_norm:
        return None
    for row in _load_catalog():
        row_key = re.sub(r'[^a-z0-9]+', '_', (row.get('class_key') or '').lower()).strip('_')
        if row_key == key_norm:
            return row
    return None


def _match_catalog(sign_code: str = '', class_key: str = '', sign_name_en: str = '') -> dict | None:
    code_norm = (sign_code or '').upper().replace('_', '-')
    key_norm = re.sub(r'[^a-z0-9]+', '_', (class_key or '').lower()).strip('_')
    name_norm = (sign_name_en or '').strip().lower()
    for row in _load_catalog():
        row_code = (row.get('sign_code') or '').upper()
        row_key = re.sub(r'[^a-z0-9]+', '_', (row.get('class_key') or '').lower()).strip('_')
        row_name = (row.get('sign_name_en') or '').strip().lower()
        if code_norm and row_code == code_norm:
            return row
        if key_norm and row_key == key_norm:
            return row
        if name_norm and row_name == name_norm:
            return row
    alias_key = _SIGN_NAME_ALIASES.get(name_norm)
    if alias_key:
        return _row_by_class_key(alias_key)
    return None


def _result_from_catalog_row(row: dict, confidence: float) -> dict:
    return {
        'sign_name': row.get('sign_name_km') or row.get('sign_name') or row.get('sign_name_en') or '',
        'sign_name_km': row.get('sign_name_km') or row.get('sign_name') or '',
        'sign_name_en': row.get('sign_name_en') or '',
        'sign_code': row.get('sign_code') or '',
        'class_key': row.get('class_key') or '',
        'category': row.get('category') or '',
        'description': row.get('description') or '',
        'description_en': row.get('description_en') or '',
        'guidance': row.get('guidance') or '',
        'guidance_en': row.get('guidance_en') or '',
        'confidence': round(float(confidence), 1),
        'detection_engine': 'gemini',
    }


def _gemini_generate(path: Path, prompt: str) -> dict | None:
    model = getattr(settings, 'GEMINI_MODEL', 'gemini-2.5-flash')
    api_key = settings.GEMINI_API_KEY
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
    headers = {
        'Content-Type': 'application/json',
        'x-goog-api-key': api_key,
    }
    payload = {
        'contents': [{
            'parts': [
                {'text': prompt},
                {
                    'inline_data': {
                        'mime_type': _guess_mime(path),
                        'data': base64.b64encode(path.read_bytes()).decode('ascii'),
                    },
                },
            ],
        }],
        'generationConfig': {
            'temperature': 0.2,
            'responseMimeType': 'application/json',
        },
    }
    timeout = _gemini_request_timeout()
    last_exc: requests.RequestException | None = None
    for attempt in range(2):
        try:
            response = requests.post(
                url,
                headers=headers,
                json=payload,
                timeout=timeout,
                verify=_requests_verify(),
            )
            if response.status_code in (401, 403):
                _mark_gemini_backoff(600)
                logger.warning('Gemini auth error %s: %s', response.status_code, response.text[:200])
                return None
            if response.status_code == 429:
                _mark_gemini_backoff(120)
                logger.warning('Gemini rate limit: %s', response.text[:200])
                return None
            if response.status_code in (502, 503, 504):
                logger.warning('Gemini transient error %s (attempt %s)', response.status_code, attempt + 1)
                if attempt == 0:
                    time.sleep(1.5)
                    continue
                return None
            if response.status_code >= 400:
                logger.warning('Gemini API error %s: %s', response.status_code, (response.text or '')[:400])
            response.raise_for_status()
            return response.json()
        except requests.Timeout as exc:
            last_exc = exc
            logger.warning('Gemini request timed out after %ss (attempt %s)', timeout, attempt + 1)
            if attempt == 0:
                continue
        except requests.RequestException as exc:
            last_exc = exc
            logger.warning('Gemini API request failed: %s', exc)
            exc_str = str(exc).lower()
            if 'ssl' in exc_str or 'certificate' in exc_str or 'verify failed' in exc_str:
                _mark_gemini_backoff(300)
            break
    if last_exc:
        logger.warning('Gemini unavailable for this request: %s', last_exc)
    return None


def detect_sign_with_gemini(image_path: str) -> dict | None:
    """
    Send image to Gemini Vision and map response to a catalog sign.

    Returns a detection payload compatible with detect_traffic_sign(), or None on failure.
    """
    if not gemini_available():
        return None

    path = Path(image_path)
    if not path.is_file():
        return None

    try:
        path.read_bytes()
    except OSError as exc:
        logger.warning('Gemini could not read image %s: %s', path, exc)
        return None

    prompt = (
        'You identify road traffic signs in photos and map them to the Cambodia catalog below.\n'
        'Internet clipart or international signs should still be mapped to the closest catalog entry.\n'
        'Examples: red circle + white horizontal bar = NO_ENTRY; red circle + white bar = NO_ENTRY.\n'
        'Catalog (sign_code | class_key | English name):\n'
        f'{_catalog_prompt_lines()}\n\n'
        'If the image has no traffic sign, set recognized=false.\n'
        'Respond with JSON only:\n'
        '{"recognized": true, "sign_code": "PW03-R1-04", "class_key": "NO_ENTRY", '
        '"sign_name_en": "No Entry", "confidence": 85}'
    )

    try:
        body = _gemini_generate(path, prompt)
        if not body:
            return None
        parts = (
            body.get('candidates', [{}])[0]
            .get('content', {})
            .get('parts', [])
        )
        text = parts[0].get('text', '') if parts else ''
        parsed = _extract_json(text)
        if not parsed or not parsed.get('recognized'):
            return None

        confidence = float(parsed.get('confidence') or 0)
        if confidence <= 0:
            confidence = 75.0

        row = _match_catalog(
            sign_code=str(parsed.get('sign_code') or ''),
            class_key=str(parsed.get('class_key') or ''),
            sign_name_en=str(parsed.get('sign_name_en') or ''),
        )
        if not row:
            logger.info('Gemini response did not match catalog: %s', parsed)
            return None

        return _result_from_catalog_row(row, confidence)
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        logger.warning('Gemini response parse failed: %s', exc)
        return None
