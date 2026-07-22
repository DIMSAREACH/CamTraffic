"""License plate region detector (YOLO plate class or heuristic ROI)."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from config import Settings, get_settings
from model_loader import load_model

logger = logging.getLogger(__name__)

_PLATE_ALIASES = {
    "license_plate",
    "number_plate",
    "plate",
    "lp",
    "numberplate",
}


def _bbox_xyxy(box: Any) -> list[float]:
    return [round(float(x), 2) for x in box]


def _clamp_bbox(bbox: list[float], w: int, h: int) -> list[int]:
    x1, y1, x2, y2 = bbox
    return [
        max(0, min(int(x1), w - 1)),
        max(0, min(int(y1), h - 1)),
        max(1, min(int(x2), w)),
        max(1, min(int(y2), h)),
    ]


def detect_plates(
    image: np.ndarray,
    vehicles: list[dict] | None = None,
    *,
    settings: Settings | None = None,
) -> list[dict]:
    """
    Detect license plate bounding boxes.

    Strategy:
    1. Prefer explicit YOLO plate classes when present in the model.
    2. Otherwise estimate plate ROI from the lower third of each vehicle bbox.
    """
    settings = settings or get_settings()
    h, w = image.shape[:2]
    plates: list[dict] = []

    model = load_model(settings)
    if model is not None:
        try:
            results = model.predict(
                source=image,
                conf=max(0.25, settings.ai_confidence_threshold - 0.1),
                verbose=False,
            )
            if results:
                result = results[0]
                names = result.names or {}
                for box in result.boxes:
                    cls_id = int(box.cls[0])
                    raw = str(names.get(cls_id, "")).lower().replace(" ", "_")
                    if raw in _PLATE_ALIASES or "plate" in raw:
                        bbox = _bbox_xyxy(box.xyxy[0].tolist())
                        plates.append(
                            {
                                "bbox": bbox,
                                "confidence": round(float(box.conf[0]), 4),
                                "source": "yolo",
                            }
                        )
        except Exception as exc:
            logger.warning("Plate YOLO pass failed: %s", exc)

    if plates:
        return plates

    # Heuristic: lower ~28% of each vehicle box
    for idx, vehicle in enumerate(vehicles or []):
        vb = vehicle.get("bbox") or []
        if len(vb) != 4:
            continue
        vx1, vy1, vx2, vy2 = vb
        vh = max(1.0, vy2 - vy1)
        vw = max(1.0, vx2 - vx1)
        px1 = vx1 + vw * 0.15
        px2 = vx2 - vw * 0.15
        py1 = vy1 + vh * 0.62
        py2 = vy2 - vh * 0.05
        bbox = _clamp_bbox([px1, py1, px2, py2], w, h)
        plates.append(
            {
                "bbox": [float(x) for x in bbox],
                "confidence": round(float(vehicle.get("confidence", 0.5)) * 0.75, 4),
                "source": "vehicle_roi",
                "vehicle_index": idx,
            }
        )

    if not plates and settings.ai_mock_mode:
        plates = [
            {
                "bbox": [350.0, 380.0, 470.0, 415.0],
                "confidence": 0.86,
                "source": "mock",
            }
        ]

    return plates


def crop_plate(image: np.ndarray, bbox: list[float], pad: float = 0.08) -> np.ndarray:
    h, w = image.shape[:2]
    x1, y1, x2, y2 = bbox
    bw, bh = x2 - x1, y2 - y1
    x1 = max(0, int(x1 - bw * pad))
    y1 = max(0, int(y1 - bh * pad))
    x2 = min(w, int(x2 + bw * pad))
    y2 = min(h, int(y2 + bh * pad))
    crop = image[y1:y2, x1:x2]
    if crop.size == 0:
        return image
    return crop


def load_image(path: Path | str) -> np.ndarray:
    image = cv2.imread(str(path))
    if image is None:
        raise ValueError(f"Unable to read image: {path}")
    return image


def decode_image_bytes(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Invalid image bytes")
    return image
