"""Resolve AI weight paths and report readiness for Detect / Ready endpoints."""
from __future__ import annotations

from pathlib import Path

from django.conf import settings


def ai_root() -> Path:
    return Path(getattr(settings, 'AI_ROOT', Path(settings.BASE_DIR).parent.parent / 'ai'))


def _resolve_weight(ref: str | Path) -> Path:
    """Resolve a model path relative to AI_ROOT/weights or as an absolute file."""
    raw = Path(str(ref or '').strip())
    if not str(raw):
        return raw
    candidates = [
        raw,
        ai_root() / 'weights' / raw.name,
        ai_root() / 'weights' / raw,
        Path(settings.BASE_DIR) / raw,
        Path(settings.BASE_DIR) / raw.name,
    ]
    for candidate in candidates:
        try:
            if candidate.is_file():
                return candidate.resolve()
        except OSError:
            continue
    return raw


def sign_model_path() -> Path:
    return _resolve_weight(getattr(settings, 'AI_MODEL_PATH', ai_root() / 'weights' / 'best.pt'))


def vehicle_model_path() -> Path:
    return _resolve_weight(getattr(settings, 'AI_VEHICLE_MODEL', 'best_cambodia_vehicles.pt'))


def plate_model_path() -> Path:
    return _resolve_weight(getattr(settings, 'AI_PLATE_DETECT_MODEL', 'best_cambodia_plates.pt'))


def helmet_model_path() -> Path:
    return _resolve_weight(getattr(settings, 'AI_HELMET_MODEL', 'best_cambodia_helmet.pt'))


def _component(
    *,
    name: str,
    enabled: bool,
    path: Path,
    required: bool = True,
    note: str = '',
) -> dict:
    exists = bool(path) and path.is_file()
    status = 'ready' if (enabled and exists) else ('disabled' if not enabled else 'missing')
    return {
        'name': name,
        'enabled': enabled,
        'path': str(path) if path else '',
        'exists': exists,
        'status': status,
        'required': required,
        'note': note,
    }


def build_model_readiness(*, warm: bool = False, warm_error: str | None = None) -> dict:
    """
    Actionable readiness payload for GET /api/ai/ready/.

    Does not load YOLO weights (fast). Use warmup endpoint to actually load models.
    """
    use_mock = bool(getattr(settings, 'AI_USE_MOCK', False))
    sign = _component(
        name='sign',
        enabled=not use_mock,
        path=sign_model_path(),
        required=True,
        note='Canonical 248-class catalog: ai/weights/best.pt',
    )
    vehicle = _component(
        name='vehicle',
        enabled=bool(getattr(settings, 'AI_VEHICLE_ENABLED', True)),
        path=vehicle_model_path(),
        required=False,
        note='Cambodia vehicles preferred; falls back to yolov8n.pt if missing',
    )
    plate = _component(
        name='plate',
        enabled=bool(getattr(settings, 'AI_PLATE_DETECT_ENABLED', True)),
        path=plate_model_path(),
        required=False,
        note='Plate YOLO → EasyOCR',
    )
    helmet = _component(
        name='helmet',
        enabled=bool(getattr(settings, 'AI_HELMET_ENABLED', True)),
        path=helmet_model_path(),
        required=False,
        note='Motorcycle helmet / no_helmet',
    )
    components = [sign, vehicle, plate, helmet]
    missing_required = [c['name'] for c in components if c['required'] and c['status'] == 'missing']
    missing_optional = [c['name'] for c in components if not c['required'] and c['status'] == 'missing']

    ready = not use_mock and not missing_required
    advice: list[str] = []
    if use_mock:
        advice.append('Set AI_USE_MOCK=False to use real YOLO weights.')
    if missing_required:
        advice.append(
            f"Missing required weights: {', '.join(missing_required)}. "
            f'Place files under {ai_root() / "weights"}.'
        )
    if missing_optional:
        advice.append(
            f"Optional weights missing (feature degraded): {', '.join(missing_optional)}."
        )
    if ready and not warm:
        advice.append('Models on disk are OK — call POST /api/ai/warmup/ before first Detect.')

    return {
        'ready': ready,
        'models_on_disk': ready,
        'warm': bool(warm),
        'use_mock': use_mock,
        'ai_root': str(ai_root()),
        'detection_mode': getattr(settings, 'AI_DETECTION_MODE', 'local'),
        'auto_create_violation': bool(getattr(settings, 'AI_PIPELINE_AUTO_CREATE_VIOLATION', True)),
        'components': {c['name']: c for c in components},
        'missing_required': missing_required,
        'missing_optional': missing_optional,
        'advice': advice,
        'error': warm_error,
    }
