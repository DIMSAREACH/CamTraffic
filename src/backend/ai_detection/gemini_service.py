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
    'no left turn allowed': 'NO_LEFT_TURN',
    'left turn prohibited': 'NO_LEFT_TURN',
    'no right turn': 'NO_RIGHT_TURN',
    'no u turn': 'NO_U_TURN',
    'no u-turn': 'NO_U_TURN',
    'no parking': 'NO_PARKING',
    'no stopping': 'NO_STOPPING',
    'stop': 'M_STOP',
    'stop sign': 'M_STOP',
    'give way': 'M_YIELD_GIVE_WAY',
    'yield': 'M_YIELD_GIVE_WAY',
    'yield sign': 'M_YIELD_GIVE_WAY',
    'pedestrian crossing': 'W_PEDESTRIAN_CROSSING',
    'school zone': 'W_SCHOOL_ZONE',
    'speed limit': 'R_SPEED_LIMIT',
    'roundabout': 'W_ROUNDABOUT_AHEAD',
    'one way': 'R_ONE_WAY',
}

# Same YOLO training keys → catalog class_key (keep in sync with services.YOLO_CLASS_ALIASES)
_CATALOG_CLASS_ALIASES: dict[str, str] = {
    'close_for_all_road_users': 'road_closed_all_users',
    'close_for_all_vehicles': 'road_closed_all_vehicles',
    'weight_limit_on_one_axle': 'axle_weight_limit',
    'no_entry_bicycle': 'p_no_bicycles',
    'no_entry_bicycle_motorcycle_tricycle': 'p_no_bicycles_motorcycles_and_tricycles',
    'no_entry_large_bus': 'p_no_buses',
    'no_entry_large_truck': 'p_no_trucks',
    'no_entry_motorcycle_drawn': 'p_no_motorcycle_drawn_carts',
    'no_entry_motor_except_motorcycle': 'p_no_motor_vehicles',
    'no_entry_motor_vehicles': 'p_no_motor_vehicles',
    'stop': 'm_stop',
    'give_way': 'm_yield_give_way',
    'yield': 'm_yield_give_way',
}


def _norm_class_token(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '_', (value or '').lower()).strip('_')


def _canonical_class_key(class_key: str) -> str:
    key = _norm_class_token(class_key)
    return _CATALOG_CLASS_ALIASES.get(key, key)


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
    from .sign_catalog_loader import load_sign_catalog_rows, resolve_catalog_path

    path = resolve_catalog_path()
    if _CATALOG_CACHE is not None and getattr(_load_catalog, '_path', None) == path:
        return _CATALOG_CACHE

    _CATALOG_CACHE = load_sign_catalog_rows(force_reload=True)
    _load_catalog._path = path  # type: ignore[attr-defined]
    return _CATALOG_CACHE


def _catalog_prompt_lines(max_rows: int | None = None, *, compact: bool = False) -> str:
    rows = _load_catalog()
    if max_rows is not None:
        rows = rows[:max_rows]
    if compact:
        lines = []
        for row in rows:
            code = row.get('sign_code') or ''
            key = row.get('class_key') or ''
            name = (row.get('sign_name_en') or row.get('sign_name') or '').strip()[:36]
            if code:
                lines.append(f'{code}|{key}|{name}')
        return '\n'.join(lines)

    by_category: dict[str, list[str]] = {}
    for row in rows:
        code = row.get('sign_code') or ''
        name = (row.get('sign_name_en') or row.get('sign_name') or '').strip()
        key = row.get('class_key') or ''
        if not code:
            continue
        category = (row.get('category') or 'other').lower()
        line = f'{code} | {key} | {name}'
        by_category.setdefault(category, []).append(line)

    sections: list[str] = []
    for category in sorted(by_category.keys()):
        lines = by_category[category]
        sections.append(f'### {category.title()} ({len(lines)})')
        sections.extend(f'- {line}' for line in lines)
    return '\n'.join(sections)


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
    key_norm = _canonical_class_key(class_key)
    if not key_norm:
        return None
    for row in _load_catalog():
        row_key = _canonical_class_key(row.get('class_key') or '')
        if row_key == key_norm:
            return row
    return None


def _match_catalog(sign_code: str = '', class_key: str = '', sign_name_en: str = '') -> dict | None:
    code_norm = (sign_code or '').upper().replace('_', '-')
    key_norm = _canonical_class_key(class_key)
    name_norm = (sign_name_en or '').strip().lower()
    for row in _load_catalog():
        row_code = (row.get('sign_code') or '').upper()
        official = (row.get('official_sign_code') or '').upper()
        row_key = _canonical_class_key(row.get('class_key') or '')
        row_name = (row.get('sign_name_en') or '').strip().lower()
        if code_norm and (row_code == code_norm or official == code_norm):
            return row
        if key_norm and row_key == key_norm:
            return row
        if name_norm and row_name == name_norm:
            return row
    alias_key = _SIGN_NAME_ALIASES.get(name_norm)
    if alias_key:
        return _row_by_class_key(alias_key)
    if name_norm:
        for row in _load_catalog():
            row_name = (row.get('sign_name_en') or '').strip().lower()
            if not row_name:
                continue
            if name_norm in row_name or row_name in name_norm:
                return row
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
    strict_verify = _requests_verify()
    verify_attempts = [strict_verify]
    if strict_verify is not False:
        verify_attempts.append(False)

    for attempt in range(2):
        for verify in verify_attempts:
            try:
                response = requests.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=timeout,
                    verify=verify,
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
                    break
                if response.status_code >= 400:
                    logger.warning('Gemini API error %s: %s', response.status_code, (response.text or '')[:400])
                response.raise_for_status()
                if verify is False and strict_verify is not False:
                    logger.warning('Gemini connected without SSL certificate verification')
                return response.json()
            except requests.Timeout as exc:
                last_exc = exc
                logger.warning('Gemini request timed out after %ss (attempt %s)', timeout, attempt + 1)
                break
            except requests.RequestException as exc:
                last_exc = exc
                exc_str = str(exc).lower()
                ssl_error = 'ssl' in exc_str or 'certificate' in exc_str or 'verify failed' in exc_str
                if ssl_error and verify is not False and len(verify_attempts) > 1:
                    logger.warning('Gemini SSL verify failed; retrying without certificate verification')
                    continue
                logger.warning('Gemini API request failed: %s', exc)
                break
        else:
            continue
        if attempt == 0:
            time.sleep(1.5)
            continue
        break
    if last_exc:
        logger.warning('Gemini unavailable for this request: %s', last_exc)
    return None


def detect_sign_with_gemini(image_path: str, *, compact: bool = False) -> dict | None:
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

    catalog_block = _catalog_prompt_lines(compact=compact) if compact else _catalog_prompt_lines()
    class_count = len(_load_catalog())
    prompt = (
        'You are a computer vision verification node for Cambodian highway traffic signs.\n'
        'Evaluate ONLY the traffic sign in this image crop (ignore background, faces, and vehicles).\n'
        'Return ONLY a matching entry from the authorized catalog below — no full sentences or explanations.\n'
        f'Authorized catalog ({class_count} signs). Format: sign_code|class_key|English name:\n'
        f'{catalog_block}\n\n'
        'Shape hints: red OCTAGON = M_STOP; red CIRCLE with arrow+slash = prohibitory turn/entry signs; '
        'red circles are NOT stop signs.\n'
        'If no traffic sign is visible in the crop, set recognized=false.\n'
        'Respond with JSON only:\n'
        '{"recognized": true, "sign_code": "R1-01", "class_key": "NO_LEFT_TURN", '
        '"sign_name_en": "No Left Turn", "confidence": 85}'
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
            confidence = 90.0

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
