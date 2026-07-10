"""End-to-end detection pipeline orchestration."""

from __future__ import annotations

import time

from app.config import PIPELINE_STORE_RESULTS
from app.detection.service import detection_service
from app.metrics.collector import metrics_collector
from app.ocr.service import ocr_service
from app.pipeline.schemas import PipelineRunResponse, PipelineStageTiming, PipelineStatusResponse
from app.processing.service import image_processor
from app.storage.service import storage_service


class PipelineService:
    def status(self) -> PipelineStatusResponse:
        detection_status = detection_service.status()
        ocr_status = ocr_service.status()
        processing_status = image_processor.status()
        storage_status = storage_service.status()

        ready = detection_status.ready and ocr_status.ready and processing_status.ready and storage_status.ready
        return PipelineStatusResponse(
            ready=ready,
            detection_mode=detection_status.mode,
            ocr_mode=ocr_status.mode,
            processing_runtime=processing_status.runtime,
            storage_ready=storage_status.ready,
            store_results=PIPELINE_STORE_RESULTS,
            message='Pipeline is ready to process images.'
            if ready
            else 'Pipeline is degraded; one or more components are unavailable.',
        )

    def run(
        self,
        image_bytes: bytes,
        *,
        camera_id: str | None = None,
        store: bool | None = None,
    ) -> PipelineRunResponse:
        should_store = PIPELINE_STORE_RESULTS if store is None else store
        total_started = time.perf_counter()

        preprocess_started = time.perf_counter()
        processed_bytes, processing = image_processor.preprocess(image_bytes)
        preprocess_ms = (time.perf_counter() - preprocess_started) * 1000

        detection_started = time.perf_counter()
        detection = detection_service.detect_image_bytes(processed_bytes)
        detection_ms = (time.perf_counter() - detection_started) * 1000

        ocr_started = time.perf_counter()
        plate_region = image_processor.extract_plate_region(processed_bytes)
        plate = ocr_service.recognize_plate(plate_region)
        ocr_ms = (time.perf_counter() - ocr_started) * 1000

        storage_started = time.perf_counter()
        record_id: str | None = None
        stored = False
        pipeline_mode = f'{processing.runtime}+{detection.mode}+{plate.mode}'

        total_ms = (time.perf_counter() - total_started) * 1000
        timings = PipelineStageTiming(
            preprocess_ms=round(preprocess_ms, 2),
            detection_ms=round(detection_ms, 2),
            ocr_ms=round(ocr_ms, 2),
            storage_ms=0.0,
            total_ms=round(total_ms, 2),
        )

        if should_store:
            storage_started = time.perf_counter()
            record = storage_service.save_pipeline_result(
                camera_id=camera_id,
                processing=processing,
                detection=detection,
                plate=plate,
                total_ms=timings.total_ms,
                pipeline_mode=pipeline_mode,
            )
            record_id = record.id
            stored = True
            timings.storage_ms = round((time.perf_counter() - storage_started) * 1000, 2)
            timings.total_ms = round((time.perf_counter() - total_started) * 1000, 2)

        metrics_collector.record_success(
            total_ms=timings.total_ms,
            preprocess_ms=timings.preprocess_ms,
            detection_ms=timings.detection_ms,
            ocr_ms=timings.ocr_ms,
            storage_ms=timings.storage_ms,
        )

        return PipelineRunResponse(
            record_id=record_id,
            stored=stored,
            camera_id=camera_id,
            processing=processing,
            detection=detection,
            plate=plate,
            timings=timings,
            pipeline_mode=pipeline_mode,
        )


pipeline_service = PipelineService()
