"""Health check endpoints for Kubernetes probes."""

from fastapi import APIRouter

from app.schemas import ApiResponse
from app.services.detector import is_ready, model_version_label

router = APIRouter(tags=["Health"])


@router.get("/health/")
async def liveness():
    return {"status": "ok", "service": "ai-vision-service"}


@router.get("/health/ready/")
async def readiness():
    ready, detail = is_ready()
    return {
        "status": "ready" if ready else "degraded",
        "model_version": model_version_label(),
        "detail": detail,
    }


@router.get("/api/v1/ai/health/", response_model=ApiResponse)
async def ai_health():
    ready, detail = is_ready()
    return ApiResponse(
        success=ready,
        message="ready" if ready else "degraded",
        data={"model_version": model_version_label(), "detail": detail},
    )
