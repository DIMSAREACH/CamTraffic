"""In-memory AI performance metrics collector."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from threading import Lock


@dataclass
class MetricsState:
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    total_ms_sum: float = 0.0
    preprocess_ms_sum: float = 0.0
    detection_ms_sum: float = 0.0
    ocr_ms_sum: float = 0.0
    storage_ms_sum: float = 0.0
    last_request_at: datetime | None = None


class MetricsCollector:
    def __init__(self) -> None:
        self._lock = Lock()
        self._state = MetricsState()

    def record_success(
        self,
        *,
        total_ms: float,
        preprocess_ms: float,
        detection_ms: float,
        ocr_ms: float,
        storage_ms: float,
    ) -> None:
        with self._lock:
            self._state.total_requests += 1
            self._state.successful_requests += 1
            self._state.total_ms_sum += total_ms
            self._state.preprocess_ms_sum += preprocess_ms
            self._state.detection_ms_sum += detection_ms
            self._state.ocr_ms_sum += ocr_ms
            self._state.storage_ms_sum += storage_ms
            self._state.last_request_at = datetime.now(UTC)

    def record_failure(self) -> None:
        with self._lock:
            self._state.total_requests += 1
            self._state.failed_requests += 1
            self._state.last_request_at = datetime.now(UTC)

    def reset(self) -> None:
        with self._lock:
            self._state = MetricsState()

    def summary(self):
        from app.metrics.schemas import MetricsSummary

        with self._lock:
            success_count = self._state.successful_requests
            divisor = success_count if success_count > 0 else 1
            return MetricsSummary(
                total_requests=self._state.total_requests,
                successful_requests=self._state.successful_requests,
                failed_requests=self._state.failed_requests,
                avg_total_ms=round(self._state.total_ms_sum / divisor, 2),
                avg_preprocess_ms=round(self._state.preprocess_ms_sum / divisor, 2),
                avg_detection_ms=round(self._state.detection_ms_sum / divisor, 2),
                avg_ocr_ms=round(self._state.ocr_ms_sum / divisor, 2),
                avg_storage_ms=round(self._state.storage_ms_sum / divisor, 2),
                last_request_at=self._state.last_request_at,
            )


metrics_collector = MetricsCollector()
