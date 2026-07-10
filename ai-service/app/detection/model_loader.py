"""Lazy YOLOv11 model loader."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any

from app.config import DETECTION_MODE, YOLO_DEVICE, YOLO_WEIGHTS_PATH


@dataclass(frozen=True)
class LoadedModel:
    model: Any
    path: Path
    class_names: dict[int, str]


_model_lock = Lock()
_loaded_model: LoadedModel | None = None
_ultralytics_import_error: str | None = None


def ultralytics_available() -> bool:
    global _ultralytics_import_error
    try:
        import ultralytics  # noqa: F401
    except ImportError as exc:
        _ultralytics_import_error = str(exc)
        return False
    _ultralytics_import_error = None
    return True


def ultralytics_error() -> str | None:
    ultralytics_available()
    return _ultralytics_import_error


def weights_found() -> bool:
    return YOLO_WEIGHTS_PATH.is_file()


def should_use_mock() -> bool:
    if DETECTION_MODE == 'mock':
        return True
    if DETECTION_MODE == 'yolo':
        return False
    return not weights_found() or not ultralytics_available()


def get_model() -> LoadedModel:
    global _loaded_model

    if should_use_mock():
        raise RuntimeError('YOLO weights are unavailable; detection is running in mock mode.')

    if _loaded_model is not None:
        return _loaded_model

    with _model_lock:
        if _loaded_model is not None:
            return _loaded_model

        if not ultralytics_available():
            raise RuntimeError(_ultralytics_import_error or 'ultralytics is not installed')

        if not weights_found():
            raise FileNotFoundError(f'YOLO weights not found at {YOLO_WEIGHTS_PATH}')

        from ultralytics import YOLO

        model = YOLO(str(YOLO_WEIGHTS_PATH))
        class_names = {int(index): str(name) for index, name in model.names.items()}
        _loaded_model = LoadedModel(model=model, path=YOLO_WEIGHTS_PATH, class_names=class_names)
        return _loaded_model


def reset_model_cache() -> None:
    global _loaded_model
    with _model_lock:
        _loaded_model = None


def detection_status_message() -> str:
    if should_use_mock():
        if DETECTION_MODE == 'mock':
            return 'Mock detection mode is enabled.'
        if not ultralytics_available():
            return 'ultralytics is not installed; using mock detections.'
        if not weights_found():
            return f'Weights not found at {YOLO_WEIGHTS_PATH}; using mock detections.'
        return 'Mock detection mode is active.'
    if not ultralytics_available():
        return _ultralytics_import_error or 'ultralytics is not installed.'
    if not weights_found():
        return f'Weights not found at {YOLO_WEIGHTS_PATH}.'
    return 'YOLOv11 model is ready for inference.'


def is_ready() -> bool:
    if should_use_mock():
        return True
    return ultralytics_available() and weights_found()
