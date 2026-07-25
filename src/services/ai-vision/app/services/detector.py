"""YOLOv11 sign and vehicle detection with mock fallback."""

from __future__ import annotations

import json
import logging
import time
import uuid
from pathlib import Path

import numpy as np

from app.config import settings
from app.schemas import (
    BehaviorDetection,
    DetectionResult,
    PlateDetection,
    SignDetection,
    VehicleDetection,
    ViolationSuggestion,
)

logger = logging.getLogger(__name__)

_MODEL = None
_MODEL_PATH: Path | None = None
_CATALOG: list[dict] | None = None

MOCK_SIGNS = [
    {"class_name": "no_entry", "confidence": 0.91, "bbox": [120, 80, 200, 160], "sign_code": "R-001"},
]
MOCK_VEHICLES = [
    {"class_name": "car", "confidence": 0.94, "bbox": [300, 200, 500, 400], "track_id": "mock_t1"},
]
MOCK_PLATES = [
    {"text": "2A-1234", "confidence": 0.86, "bbox": [350, 380, 420, 400], "format_valid": True},
]

YOLO_CLASS_ALIASES = {
    "stop": "m_stop",
    "give_way": "m_yield_give_way",
    "yield": "m_yield_give_way",
    "no_entry": "p_no_entry",
}


def _load_catalog() -> list[dict]:
    global _CATALOG
    if _CATALOG is not None:
        return _CATALOG
    catalog_path = settings.resolve_path(settings.ai_sign_catalog_path)
    if catalog_path.is_file():
        with catalog_path.open(encoding="utf-8") as f:
            data = json.load(f)
        _CATALOG = data if isinstance(data, list) else data.get("signs", [])
    else:
        _CATALOG = []
    return _CATALOG


def _catalog_code_for_class(class_name: str) -> str | None:
    key = YOLO_CLASS_ALIASES.get(class_name, class_name)
    for item in _load_catalog():
        if item.get("class_key") == key or item.get("yolo_class") == class_name:
            return item.get("sign_code") or item.get("code")
    return None


def _get_model():
    global _MODEL, _MODEL_PATH
    weights = settings.resolve_path(settings.ai_weights_path)
    if settings.ai_mock_mode or not weights.is_file():
        return None
    if _MODEL is not None and _MODEL_PATH == weights:
        return _MODEL
    try:
        from ultralytics import YOLO

        _MODEL = YOLO(str(weights))
        _MODEL_PATH = weights
        logger.info("Loaded YOLO weights from %s", weights)
        return _MODEL
    except Exception as exc:
        logger.warning("Failed to load YOLO model: %s", exc)
        return None


def model_version_label() -> str:
    if settings.ai_mock_mode:
        return "mock/1.0.0"
    weights = settings.resolve_path(settings.ai_weights_path)
    if weights.is_file():
        return f"yolo11/{weights.name}"
    return "unavailable/0.0.0"


def _bbox_xyxy(box) -> list[float]:
    return [float(x) for x in box]


def _run_yolo(image_path: Path) -> tuple[list[SignDetection], list[VehicleDetection]]:
    model = _get_model()
    if model is None:
        return [], []

    results = model.predict(
        source=str(image_path),
        conf=settings.ai_confidence_threshold,
        verbose=False,
    )
    if not results:
        return [], []

    result = results[0]
    names = result.names or {}
    signs: list[SignDetection] = []
    vehicles: list[VehicleDetection] = []

    vehicle_classes = {"car", "truck", "bus", "motorcycle", "motorbike", "bicycle"}

    for box in result.boxes:
        cls_id = int(box.cls[0])
        class_name = names.get(cls_id, str(cls_id))
        conf = float(box.conf[0])
        bbox = _bbox_xyxy(box.xyxy[0].tolist())

        if class_name in vehicle_classes or class_name.endswith("_vehicle"):
            vehicles.append(
                VehicleDetection(
                    **{"class": class_name},
                    confidence=round(conf, 4),
                    bbox=bbox,
                )
            )
        else:
            signs.append(
                SignDetection(
                    **{"class": class_name},
                    confidence=round(conf, 4),
                    bbox=bbox,
                    sign_code=_catalog_code_for_class(class_name),
                )
            )

    return signs, vehicles


def _mock_result() -> DetectionResult:
    return DetectionResult(
        detection_id=str(uuid.uuid4()),
        processing_ms=42,
        model_version="mock/1.0.0",
        mock_mode=True,
        signs=[SignDetection(**s) for s in MOCK_SIGNS],
        vehicles=[VehicleDetection(**v) for v in MOCK_VEHICLES],
        plates=[PlateDetection(**p) for p in MOCK_PLATES],
        violation_suggestions=[
            ViolationSuggestion(
                violation_type="NO_ENTRY",
                auto_eligible=True,
                suggested_fine_khr=40000,
            )
        ],
    )


def _suggest_violations(signs: list[SignDetection]) -> list[ViolationSuggestion]:
    suggestions: list[ViolationSuggestion] = []
    for sign in signs:
        name = sign.class_name.lower()
        if "no_entry" in name or name == "p_no_entry":
            suggestions.append(
                ViolationSuggestion(
                    violation_type="NO_ENTRY",
                    auto_eligible=sign.confidence >= 0.75,
                    suggested_fine_khr=40000,
                )
            )
        elif "stop" in name:
            suggestions.append(
                ViolationSuggestion(
                    violation_type="STOP_SIGN_VIOLATION",
                    auto_eligible=sign.confidence >= 0.75,
                    suggested_fine_khr=30000,
                )
            )
    return suggestions


def run_detection(image_path: Path, *, enable_ocr: bool = True) -> DetectionResult:
    """Run full detection pipeline on a local image file."""
    started = time.perf_counter()

    if settings.ai_mock_mode:
        result = _mock_result()
        result.processing_ms = int((time.perf_counter() - started) * 1000)
        return result

    model = _get_model()
    if model is None:
        result = _mock_result()
        result.processing_ms = int((time.perf_counter() - started) * 1000)
        result.mock_mode = True
        result.model_version = model_version_label()
        return result

    signs, vehicles = _run_yolo(image_path)
    plates: list[PlateDetection] = []

    if enable_ocr and settings.ai_ocr_enabled and vehicles:
        from app.services.ocr import recognize_plates_for_vehicles

        plates = recognize_plates_for_vehicles(image_path, vehicles)

    processing_ms = int((time.perf_counter() - started) * 1000)

    return DetectionResult(
        detection_id=str(uuid.uuid4()),
        processing_ms=processing_ms,
        model_version=model_version_label(),
        mock_mode=False,
        signs=signs,
        vehicles=vehicles,
        plates=plates,
        behaviors=[],  # Phase 3: helmet/seatbelt/phone models
        violation_suggestions=_suggest_violations(signs),
    )


def is_ready() -> tuple[bool, str]:
    if settings.ai_mock_mode:
        return True, "mock mode"
    weights = settings.resolve_path(settings.ai_weights_path)
    if weights.is_file():
        return _get_model() is not None, f"weights={weights.name}"
    return False, f"weights not found: {weights}"
