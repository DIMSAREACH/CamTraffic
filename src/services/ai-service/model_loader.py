"""YOLO model loader with lazy init and mock fallback."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from config import Settings, get_settings

logger = logging.getLogger(__name__)

_MODEL: Any = None
_MODEL_PATH: Path | None = None


def load_model(settings: Settings | None = None):
    """Load Ultralytics YOLO weights once; return None in mock mode."""
    global _MODEL, _MODEL_PATH
    settings = settings or get_settings()

    if settings.ai_mock_mode:
        logger.info("AI_MOCK_MODE=true — skipping YOLO load")
        return None

    weights = settings.resolve_path(settings.ai_weights_path)
    if not weights.is_file():
        logger.warning("Weights not found at %s — mock inference will be used", weights)
        return None

    if _MODEL is not None and _MODEL_PATH == weights:
        return _MODEL

    try:
        from ultralytics import YOLO

        _MODEL = YOLO(str(weights))
        _MODEL_PATH = weights
        logger.info("Loaded YOLO model from %s", weights)
        return _MODEL
    except Exception as exc:  # pragma: no cover - environment dependent
        logger.exception("Failed to load YOLO model: %s", exc)
        _MODEL = None
        _MODEL_PATH = None
        return None


def model_version(settings: Settings | None = None) -> str:
    settings = settings or get_settings()
    if settings.ai_mock_mode:
        return "mock/1.0.0"
    weights = settings.resolve_path(settings.ai_weights_path)
    if weights.is_file():
        return f"yolov8/{weights.name}"
    return "unavailable/0.0.0"


def unload_model() -> None:
    global _MODEL, _MODEL_PATH
    _MODEL = None
    _MODEL_PATH = None


def is_ready(settings: Settings | None = None) -> tuple[bool, str]:
    settings = settings or get_settings()
    if settings.ai_mock_mode:
        return True, "mock mode"
    weights = settings.resolve_path(settings.ai_weights_path)
    if not weights.is_file():
        return False, f"weights missing: {weights}"
    model = load_model(settings)
    return model is not None, f"weights={weights.name}"
