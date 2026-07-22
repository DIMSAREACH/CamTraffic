"""Redis heartbeat + frame event publishing."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import redis

from app.config import settings

logger = logging.getLogger(__name__)

_client: redis.Redis | None = None


def get_redis() -> redis.Redis | None:
    global _client
    if _client is not None:
        return _client
    try:
        _client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
        _client.ping()
        return _client
    except Exception as exc:
        logger.warning("Redis unavailable: %s", exc)
        return None


def publish_frame_event(camera_id: str, *, frame_count: int, fps_actual: float) -> None:
    client = get_redis()
    if client is None:
        return
    payload = {
        "camera_id": camera_id,
        "frame_count": frame_count,
        "fps_actual": round(fps_actual, 2),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        client.xadd(
            f"camtraffic:frames:{camera_id}",
            {"payload": json.dumps(payload)},
            maxlen=1000,
            approximate=True,
        )
        client.setex(
            f"stream:camera:{camera_id}:health",
            60,
            json.dumps({"status": "online", **payload}),
        )
    except Exception as exc:
        logger.debug("Redis publish failed: %s", exc)
