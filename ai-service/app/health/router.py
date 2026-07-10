"""FastAPI routes for AI service health monitoring."""

from fastapi import APIRouter

from app.health.schemas import DetailedHealthResponse, HealthResponse
from app.health.service import health_monitor

router = APIRouter(tags=['health'])


@router.get('/health', response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return health_monitor.health()


@router.get('/health/detailed', response_model=DetailedHealthResponse)
async def detailed_health_check() -> DetailedHealthResponse:
    return health_monitor.detailed_health()
