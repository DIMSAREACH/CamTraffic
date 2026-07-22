"""
Match live webcam crops against the 236-sign catalog using reference PNG histograms.

Fast local fallback when YOLO misses — no API key required.
"""
from __future__ import annotations

import json
import logging
import re
from pathlib import Path

import cv2
import numpy as np
from django.conf import settings

logger = logging.getLogger(__name__)

AI_ROOT = Path(settings.BASE_DIR).parent / 'ai'
CATALOG_PATH = AI_ROOT / 'sign_catalog.json'
MEDIA_SIGNS_DIR = Path(settings.MEDIA_ROOT) / 'signs'

_INDEX: dict[str, np.ndarray] | None = None
_CODE_TO_ROW: dict[str, dict] | None = None
_INDEX_SIZE = 0


def catalog_visual_match_enabled() -> bool:
    return bool(getattr(settings, 'AI_CATALOG_VISUAL_MATCH_ENABLED', True))


def _match_min_correlation() -> float:
    return float(getattr(settings, 'AI_CATALOG_VISUAL_MIN_SCORE', 0.58))


def _live_match_min_correlation() -> float:
    return float(getattr(settings, 'AI_CATALOG_VISUAL_LIVE_MIN_SCORE', 0.62))


def _match_min_margin() -> float:
    return float(getattr(settings, 'AI_CATALOG_VISUAL_MIN_MARGIN', 0.06))


def _load_catalog_rows() -> list[dict]:
    from .sign_catalog_loader import load_sign_catalog_rows

    return load_sign_catalog_rows()


def _norm_code(value: str) -> str:
    return (value or '').upper().replace('_', '-')


def _sign_code_from_stem(stem: str) -> str | None:
    from .services import _catalog_row_for_token, _sign_code_from_basename

    code = _sign_code_from_basename(stem)
    if code:
        return _norm_code(code)

    upper = stem.upper().replace('_', '-')
    candidates = [upper]
    pw = re.match(r'^(PW03-R\d+-\d+)', upper)
    if pw:
        candidates.append(pw.group(1))
    wp = re.match(r'^([WIP]-\d{3})', upper.replace('PW03-', 'P-'))
    if wp:
        candidates.append(wp.group(1))

    for token in candidates:
        row = _catalog_row_for_token(token)
        if row and row.get('sign_code'):
            return _norm_code(row['sign_code'])
    return None


def _histogram(image_path: str) -> np.ndarray | None:
    img = cv2.imread(str(image_path))
    if img is None:
        return None
    side = min(img.shape[:2])
    if side < 32:
        return None
    scale = 128 / side
    resized = cv2.resize(img, (128, 128), interpolation=cv2.INTER_AREA)
    hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1], None, [48, 48], [0, 180, 0, 256])
    cv2.normalize(hist, hist)
    return hist


def _pick_best_image_per_code() -> dict[str, str]:
    chosen: dict[str, tuple[int, str]] = {}

    def consider(path: Path) -> None:
        if path.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
            return
        code = _sign_code_from_stem(path.stem)
        if not code:
            return
        score = len(path.stem)
        if re.search(r'_[a-zA-Z0-9]{6,8}$', path.stem):
            score += 40
        prev = chosen.get(code)
        if not prev or score < prev[0]:
            chosen[code] = (score, str(path))

    if MEDIA_SIGNS_DIR.is_dir():
        for path in MEDIA_SIGNS_DIR.iterdir():
            if path.is_file():
                consider(path)

    try:
        from traffic_signs.models import TrafficSign

        for sign in TrafficSign.objects.exclude(image='').exclude(image__isnull=True).iterator():
            code = _norm_code(sign.sign_code or '')
            if not code or not sign.image:
                continue
            try:
                path = Path(sign.image.path)
            except (OSError, ValueError):
                continue
            if path.is_file():
                consider(path)
    except Exception as exc:
        logger.debug('Catalog visual match DB scan skipped: %s', exc)

    return {code: path for code, (_, path) in chosen.items()}


def _ensure_index() -> tuple[dict[str, np.ndarray], dict[str, dict]]:
    global _INDEX, _CODE_TO_ROW, _INDEX_SIZE
    if _INDEX is not None and _CODE_TO_ROW is not None:
        return _INDEX, _CODE_TO_ROW

    rows = _load_catalog_rows()
    _CODE_TO_ROW = {_norm_code(r.get('sign_code', '')): r for r in rows if r.get('sign_code')}

    index: dict[str, np.ndarray] = {}
    for code, path in _pick_best_image_per_code().items():
        hist = _histogram(path)
        if hist is not None and code in _CODE_TO_ROW:
            index[code] = hist

    _INDEX = index
    _INDEX_SIZE = len(index)
    logger.info('Catalog visual index: %s sign images (of %s catalog)', _INDEX_SIZE, len(_CODE_TO_ROW))
    return _INDEX, _CODE_TO_ROW


def catalog_visual_index_size() -> int:
    index, _ = _ensure_index()
    return len(index)


def _catalog_code_blocked_for_profile(code: str, row: dict, profile: str) -> bool:
    if profile != 'white_field':
        return False
    key = (row.get('class_key') or '').upper()
    return code == 'M-032' or key in ('M_STOP', 'M_STOP_KHMER_AND_ENGLISH_LANGUAGES')


def _catalog_margin_acceptable(
    *,
    best_code: str,
    best_score: float,
    margin: float,
    min_margin: float,
    image_path: str,
    row: dict,
    profile: str,
) -> bool:
    """Profile-aware acceptance when histogram ties are common (prohibitory / warning signs)."""
    from .services import _prohibitory_red_ring_hint

    has_red_ring = _prohibitory_red_ring_hint(image_path)
    category = (row.get('category') or '').lower()

    if profile == 'white_field' and not has_red_ring:
        return margin >= max(min_margin, 0.12)

    if profile == 'red_field' or has_red_ring or category in ('prohibitory', 'mandatory'):
        return best_score >= 0.97

    if category == 'warning':
        return best_score >= 0.999

    if margin >= min_margin:
        return True

    return best_score >= 0.99


def match_sign_from_catalog_images(image_path: str, *, live_capture: bool = False) -> dict | None:
    """Return a detection payload when the crop matches a catalog reference image."""
    if not catalog_visual_match_enabled():
        return None

    if live_capture:
        from .live_sign_presence import live_sign_present

        if not live_sign_present(image_path):
            return None

    query_hist = _histogram(image_path)
    if query_hist is None:
        return None

    index, code_to_row = _ensure_index()
    if not index:
        return None

    from .services import _red_sign_inner_profile

    profile = _red_sign_inner_profile(image_path)
    scored: list[tuple[str, float]] = []
    for code, ref_hist in index.items():
        row = code_to_row.get(code) or {}
        if _catalog_code_blocked_for_profile(code, row, profile):
            continue
        score = float(cv2.compareHist(query_hist, ref_hist, cv2.HISTCMP_CORREL))
        scored.append((code, score))

    if not scored:
        return None

    scored.sort(key=lambda item: item[1], reverse=True)
    best_code, best_score = scored[0]
    second_score = scored[1][1] if len(scored) > 1 else -1.0
    margin = best_score - second_score

    min_score = _live_match_min_correlation() if live_capture else _match_min_correlation()
    min_margin = _match_min_margin() if live_capture else max(_match_min_margin(), 0.08)

    from .services import _no_u_turn_shape_hint, _prohibitory_red_ring_hint

    if not live_capture and profile == 'white_field' and not _prohibitory_red_ring_hint(image_path):
        min_margin = max(min_margin, 0.12)

    if profile == 'white_field':
        if _no_u_turn_shape_hint(image_path):
            for code, score in scored[:24]:
                row = code_to_row.get(code) or {}
                key = (row.get('class_key') or '').upper()
                if key == 'NO_U_TURN' and score >= best_score - 0.15:
                    best_code, best_score = code, score
                    break
        else:
            for code, score in scored[:20]:
                row = code_to_row.get(code) or {}
                key = (row.get('class_key') or '').upper()
                if key in ('NO_LEFT_TURN', 'NO_RIGHT_TURN') and score >= best_score - 0.12:
                    best_code, best_score = code, score
                    break

    if not best_code or best_score < min_score:
        return None

    row = code_to_row.get(best_code)
    if not row:
        return None

    if not _catalog_margin_acceptable(
        best_code=best_code,
        best_score=best_score,
        margin=margin,
        min_margin=min_margin,
        image_path=image_path,
        row=row,
        profile=profile,
    ):
        return None

    if live_capture:
        confidence = min(96.0, max(86.0, best_score * 100 + 18.0 + margin * 30.0))
    else:
        confidence = min(96.0, max(55.0, best_score * 100))
    from .services import _result_from_catalog_row, _stop_false_positive_for_image

    result = _result_from_catalog_row(
        row,
        class_key=row.get('class_key') or '',
        confidence=confidence,
    )
    if _stop_false_positive_for_image(image_path, result):
        return None
    result['detection_engine'] = 'catalog_match'
    result['catalog_match_score'] = round(best_score, 4)
    result['catalog_match_margin'] = round(margin, 4)
    result['sign_present'] = True
    return result
