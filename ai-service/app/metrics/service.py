"""AI performance metrics service."""

from app.metrics.collector import MetricsCollector, metrics_collector
from app.metrics.schemas import MetricsResetResponse, MetricsSummary


class MetricsService:
    def __init__(self, collector: MetricsCollector | None = None) -> None:
        self.collector = collector or metrics_collector

    def summary(self) -> MetricsSummary:
        return self.collector.summary()

    def reset(self) -> MetricsResetResponse:
        self.collector.reset()
        return MetricsResetResponse(message='Metrics counters reset successfully.')


metrics_service = MetricsService()
