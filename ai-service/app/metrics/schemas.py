"""Pydantic schemas for AI performance metrics."""

from datetime import datetime

from pydantic import BaseModel


class MetricsSummary(BaseModel):
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_total_ms: float
    avg_preprocess_ms: float
    avg_detection_ms: float
    avg_ocr_ms: float
    avg_storage_ms: float
    last_request_at: datetime | None = None


class MetricsResetResponse(BaseModel):
    message: str
