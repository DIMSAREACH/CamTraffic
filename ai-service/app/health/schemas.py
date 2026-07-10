"""Pydantic schemas for AI service health monitoring."""

from typing import Literal

from pydantic import BaseModel

from app.metrics.schemas import MetricsSummary


class ComponentHealth(BaseModel):
    name: str
    status: Literal['ok', 'degraded', 'unavailable']
    message: str


class HealthResponse(BaseModel):
    status: Literal['ok', 'degraded', 'unavailable']
    service: str
    port: int
    backend_url: str
    components: list[ComponentHealth]
    metrics: MetricsSummary


class DetailedHealthResponse(HealthResponse):
    model_path: str
    weights_path: str
    confidence_threshold: float
    detection_mode: str
    ocr_mode: str
    storage_dir: str
    storage_record_count: int
