"""AI service health monitoring."""

from typing import Literal

from app.config import (
    BACKEND_URL,
    CONFIDENCE_THRESHOLD,
    DETECTION_MODE,
    MODEL_PATH,
    OCR_MODE,
    PORT,
    YOLO_WEIGHTS_PATH,
)
from app.detection.service import detection_service
from app.health.schemas import ComponentHealth, DetailedHealthResponse, HealthResponse
from app.metrics.service import metrics_service
from app.ocr.service import ocr_service
from app.pipeline.service import pipeline_service
from app.processing.service import image_processor
from app.storage.service import storage_service


class HealthMonitor:
    def _component_status(self, ready: bool, degraded_ok: bool = False) -> Literal['ok', 'degraded', 'unavailable']:
        if ready:
            return 'ok'
        if degraded_ok:
            return 'degraded'
        return 'unavailable'

    def _build_components(self) -> list[ComponentHealth]:
        detection = detection_service.status()
        processing = image_processor.status()
        ocr = ocr_service.status()
        storage = storage_service.status()
        pipeline = pipeline_service.status()

        return [
            ComponentHealth(
                name='processing',
                status=self._component_status(processing.ready, degraded_ok=True),
                message=processing.message,
            ),
            ComponentHealth(
                name='detection',
                status=self._component_status(detection.ready, degraded_ok=detection.mode == 'mock'),
                message=detection.message,
            ),
            ComponentHealth(
                name='ocr',
                status=self._component_status(ocr.ready, degraded_ok=ocr.mode == 'mock'),
                message=ocr.message,
            ),
            ComponentHealth(
                name='storage',
                status=self._component_status(storage.ready),
                message=storage.message,
            ),
            ComponentHealth(
                name='pipeline',
                status=self._component_status(pipeline.ready, degraded_ok=True),
                message=pipeline.message,
            ),
        ]

    def _aggregate_status(self, components: list[ComponentHealth]) -> Literal['ok', 'degraded', 'unavailable']:
        statuses = {component.status for component in components}
        if 'unavailable' in statuses:
            if statuses == {'unavailable'}:
                return 'unavailable'
            return 'degraded'
        if 'degraded' in statuses:
            return 'degraded'
        return 'ok'

    def health(self) -> HealthResponse:
        components = self._build_components()
        return HealthResponse(
            status=self._aggregate_status(components),
            service='ai-service',
            port=PORT,
            backend_url=BACKEND_URL,
            components=components,
            metrics=metrics_service.summary(),
        )

    def detailed_health(self) -> DetailedHealthResponse:
        base = self.health()
        storage = storage_service.status()
        return DetailedHealthResponse(
            **base.model_dump(),
            model_path=MODEL_PATH,
            weights_path=str(YOLO_WEIGHTS_PATH),
            confidence_threshold=CONFIDENCE_THRESHOLD,
            detection_mode=DETECTION_MODE,
            ocr_mode=OCR_MODE,
            storage_dir=storage.storage_dir,
            storage_record_count=storage.record_count,
        )


health_monitor = HealthMonitor()
