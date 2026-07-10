"""FastAPI routes for AI performance metrics."""

from fastapi import APIRouter

from app.metrics.schemas import MetricsResetResponse, MetricsSummary
from app.metrics.service import metrics_service

router = APIRouter(prefix='/metrics', tags=['metrics'])


@router.get('/summary', response_model=MetricsSummary)
async def metrics_summary() -> MetricsSummary:
    return metrics_service.summary()


@router.post('/reset', response_model=MetricsResetResponse)
async def reset_metrics() -> MetricsResetResponse:
    return metrics_service.reset()
