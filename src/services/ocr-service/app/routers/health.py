"""Health probes."""

from fastapi import APIRouter

from app.schemas import ApiResponse
from app.services.plate_reader import is_ready

router = APIRouter(tags=["Health"])


@router.get("/health/")
async def liveness():
    return {"status": "ok", "service": "ocr-service"}


@router.get("/health/ready/")
async def readiness():
    ready, detail = is_ready()
    return {"status": "ready" if ready else "degraded", "detail": detail}


@router.get("/api/v1/ocr/health/", response_model=ApiResponse)
async def ocr_health():
    ready, detail = is_ready()
    return ApiResponse(success=ready, message="ready" if ready else "degraded", data={"detail": detail})
