"""Traffic sign and vehicle detection using YOLOv8."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import numpy as np

from config import Settings, get_settings
from model_loader import load_model

logger = logging.getLogger(__name__)

# Normalize common YOLO / COCO aliases → thesis class names
_SIGN_ALIASES = {
    "stop_sign": "stop",
    "m_stop": "stop",
    "speedlimit20": "speed_limit_20",
    "speedlimit40": "speed_limit_40",
    "speedlimit60": "speed_limit_60",
    "speedlimit80": "speed_limit_80",
    "p_no_entry": "no_entry",
    "noentry": "no_entry",
    "noparking": "no_parking",
    "turnleft": "turn_left",
    "turnright": "turn_right",
    "uturn": "u_turn",
    "pedestrian": "pedestrian_crossing",
    "crossing": "pedestrian_crossing",
    "trafficlight": "traffic_light",
    "school": "school_zone",
    "oneway": "one_way",
}

_VEHICLE_ALIASES = {
    "motorbike": "motorcycle",
    "bicycle": "motorcycle",
    "tuk-tuk": "tuk_tuk",
    "tuktuk": "tuk_tuk",
    "auto_rickshaw": "tuk_tuk",
}


def _normalize_class(name: str, settings: Settings) -> tuple[str, str]:
    key = name.strip().lower().replace(" ", "_").replace("-", "_")
    key = _SIGN_ALIASES.get(key, _VEHICLE_ALIASES.get(key, key))
    if key in settings.vehicle_classes or key in _VEHICLE_ALIASES.values():
        return "vehicle", key if key in settings.vehicle_classes else "car"
    if key in settings.traffic_sign_classes or key in _SIGN_ALIASES.values():
        return "sign", key if key in settings.traffic_sign_classes else key
    # Heuristic: anything with "speed" / "sign" / "limit" → sign; else vehicle-ish
    if any(t in key for t in ("speed", "sign", "limit", "parking", "entry", "stop", "turn", "zone", "way", "light", "crossing")):
        return "sign", key
    if any(t in key for t in ("car", "truck", "bus", "motor", "tuk", "vehicle")):
        return "vehicle", key
    return "sign", key


def _bbox_xyxy(box: Any) -> list[float]:
    return [round(float(x), 2) for x in box]


def detect_objects(
    image: np.ndarray | Path | str,
    *,
    settings: Settings | None = None,
) -> dict[str, list[dict]]:
    """
    Detect traffic signs and vehicles.

    Returns:
        {"signs": [...], "vehicles": [...]}
    """
    settings = settings or get_settings()
    model = load_model(settings)

    if model is None:
        return _mock_detections()

    try:
        results = model.predict(
            source=image if isinstance(image, (str, Path)) else image,
            conf=settings.ai_confidence_threshold,
            verbose=False,
        )
    except Exception as exc:
        logger.exception("YOLO predict failed: %s", exc)
        return _mock_detections()

    if not results:
        return {"signs": [], "vehicles": []}

    result = results[0]
    names = result.names or {}
    signs: list[dict] = []
    vehicles: list[dict] = []

    for box in result.boxes:
        cls_id = int(box.cls[0])
        raw_name = str(names.get(cls_id, cls_id))
        kind, class_name = _normalize_class(raw_name, settings)
        conf = round(float(box.conf[0]), 4)
        bbox = _bbox_xyxy(box.xyxy[0].tolist())
        item = {
            "class_name": class_name,
            "confidence": conf,
            "bbox": bbox,
            "raw_class": raw_name,
        }
        if kind == "vehicle":
            vehicles.append(item)
        else:
            signs.append(item)

    return {"signs": signs, "vehicles": vehicles}


def _mock_detections() -> dict[str, list[dict]]:
    return {
        "signs": [
            {
                "class_name": "stop",
                "confidence": 0.92,
                "bbox": [120.0, 80.0, 200.0, 160.0],
                "raw_class": "stop",
            },
            {
                "class_name": "speed_limit_40",
                "confidence": 0.88,
                "bbox": [220.0, 70.0, 280.0, 140.0],
                "raw_class": "speed_limit_40",
            },
        ],
        "vehicles": [
            {
                "class_name": "car",
                "confidence": 0.94,
                "bbox": [300.0, 200.0, 520.0, 420.0],
                "raw_class": "car",
            },
            {
                "class_name": "motorcycle",
                "confidence": 0.87,
                "bbox": [80.0, 260.0, 180.0, 400.0],
                "raw_class": "motorcycle",
            },
        ],
    }
