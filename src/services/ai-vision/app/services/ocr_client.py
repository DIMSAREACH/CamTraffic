"""HTTP client for ocr-service."""

from __future__ import annotations

import json
import logging
from pathlib import Path

import httpx

from app.config import settings
from app.schemas import PlateDetection, VehicleDetection

logger = logging.getLogger(__name__)


def ocr_service_enabled() -> bool:
    return bool((settings.ocr_service_url or "").strip())


def _base_url() -> str:
    return settings.ocr_service_url.rstrip("/")


def read_frame_via_ocr_service(
    image_path: Path,
    vehicles: list[VehicleDetection],
    *,
    timeout: float = 60.0,
) -> dict | None:
    """POST /api/v1/ocr/read-frame/ and return data dict."""
    url = f"{_base_url()}/api/v1/ocr/read-frame/"
    vehicle_payload = []
    for vehicle in vehicles:
        vehicle_payload.append({
            "bbox": vehicle.bbox,
            "vehicle_type": vehicle.class_name,
        })

    with image_path.open("rb") as fh:
        files = {"image": (image_path.name, fh, "application/octet-stream")}
        data = {"vehicles": json.dumps(vehicle_payload)}
        with httpx.Client(timeout=timeout) as client:
            response = client.post(url, files=files, data=data)
            response.raise_for_status()
            envelope = response.json()

    if not envelope.get("success"):
        return None
    return envelope.get("data") or {}


def map_remote_to_plates(data: dict, vehicles: list[VehicleDetection]) -> list[PlateDetection]:
    plate_text = (data.get("plate_text") or "").strip()
    if not plate_text:
        return []

    confidence = float(data.get("plate_confidence") or 0)
    bbox = vehicles[0].bbox if vehicles else [0, 0, 0, 0]
    return [
        PlateDetection(
            text=plate_text,
            confidence=round(confidence, 4),
            bbox=bbox,
            format_valid=bool(data.get("format_valid")),
        )
    ]
