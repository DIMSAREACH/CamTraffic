"""Optional forward frames to ai-vision-service."""

from __future__ import annotations

import logging
from pathlib import Path

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def vision_service_enabled() -> bool:
    return bool((settings.ai_vision_service_url or "").strip()) and settings.stream_auto_detect


def detect_frame(image_path: Path, camera_id: str) -> dict | None:
    if not vision_service_enabled():
        return None
    base = settings.ai_vision_service_url.rstrip("/")
    url = f"{base}/api/v1/ai/detect/"
    try:
        with image_path.open("rb") as fh:
            files = {"image": (image_path.name, fh, "image/jpeg")}
            data = {"camera_id": camera_id}
            with httpx.Client(timeout=120.0) as client:
                response = client.post(url, files=files, data=data)
                response.raise_for_status()
                return response.json()
    except Exception as exc:
        logger.warning("ai-vision detect failed for camera %s: %s", camera_id, exc)
        return None
