"""Health endpoints."""

from fastapi import APIRouter

from app.schemas import ApiResponse
from app.services.redis_queue import get_redis

router = APIRouter(tags=["Health"])


@router.get("/health/")
async def liveness():
    return {"status": "ok", "service": "stream-gateway"}


@router.get("/health/ready/")
async def readiness():
    redis_ok = get_redis() is not None
    return {
        "status": "ready" if redis_ok else "degraded",
        "redis": "ok" if redis_ok else "unavailable",
    }


@router.get("/api/v1/streams/health/", response_model=ApiResponse)
async def streams_health():
    redis_ok = get_redis() is not None
    return ApiResponse(
        success=True,
        message="ready" if redis_ok else "degraded",
        data={"redis": "ok" if redis_ok else "unavailable"},
    )
