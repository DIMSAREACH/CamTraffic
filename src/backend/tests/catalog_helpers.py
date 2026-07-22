"""Shared helpers for sign-catalog tests (production catalog vs full 236-class)."""
from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FULL_CATALOG_PATH = ROOT / 'ai' / 'sign_catalog.json'

# Official PW03 / short thesis codes <-> production catalog display codes.
CODE_ALIASES: dict[str, set[str]] = {
    'PW03-R1-04': {'R1-04', 'PROH-001'},
    'PW03-R1-01': {'R1-01', 'PROH-002'},
    'PW03-R1-02': {'R1-02', 'PROH-003'},
    'PW03-R1-03': {'R1-03', 'PROH-004'},
    'PW03-R2-10': {'R2-10', 'PROH-005'},
    'M-032': {'MAN-001'},
}


def equivalent_sign_codes(*codes: str) -> set[str]:
    allowed: set[str] = set()
    for raw in codes:
        code = (raw or '').upper().replace('_', '-')
        if not code:
            continue
        allowed.add(code)
        for official, aliases in CODE_ALIASES.items():
            group = {official, *aliases}
            if code in group:
                allowed.update(group)
    return allowed


def assert_sign_code(test_case, result: dict, *codes: str) -> None:
    actual = (result.get('sign_code') or '').upper().replace('_', '-')
    allowed = equivalent_sign_codes(*codes)
    test_case.assertIn(
        actual,
        allowed,
        f"sign_code {actual!r} not in {sorted(allowed)}",
    )


def sign_media_path(media_root: str | Path, *candidates: str) -> Path:
    media = Path(media_root) / 'signs'
    for name in candidates:
        path = media / name
        if path.is_file():
            return path
    return media / candidates[0]


def _clear_catalog_caches() -> None:
    from ai_detection.sign_catalog_loader import invalidate_catalog_cache

    invalidate_catalog_cache()
    try:
        from ai_detection import services

        services._SIGN_CATALOG_CACHE = None
    except Exception:
        pass
    try:
        from ai_detection import gemini_service

        gemini_service._CATALOG_CACHE = None
    except Exception:
        pass
    try:
        from ai_detection import catalog_visual_match as cvm

        cvm._INDEX = None
        cvm._CODE_TO_ROW = None
        cvm._INDEX_SIZE = 0
    except Exception:
        pass


@contextmanager
def use_full_sign_catalog():
    """Force tests to use the 236-class ai/sign_catalog.json."""
    old = os.environ.get('AI_SIGN_CATALOG_PATH')
    os.environ['AI_SIGN_CATALOG_PATH'] = str(FULL_CATALOG_PATH)
    _clear_catalog_caches()
    try:
        yield
    finally:
        if old is None:
            os.environ.pop('AI_SIGN_CATALOG_PATH', None)
        else:
            os.environ['AI_SIGN_CATALOG_PATH'] = old
        _clear_catalog_caches()


def catalog_10_active() -> bool:
    from ai_detection.sign_catalog_loader import resolve_catalog_path

    return resolve_catalog_path().name == 'traffic_sign_catalog_10.json'
