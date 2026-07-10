"""Pydantic schemas for the end-to-end detection pipeline."""

from typing import Literal

from pydantic import BaseModel

from app.detection.schemas import DetectionResponse
from app.ocr.schemas import PlateOCRResponse
from app.processing.schemas import ProcessingResult


class PipelineStageTiming(BaseModel):
    preprocess_ms: float
    detection_ms: float
    ocr_ms: float
    storage_ms: float
    total_ms: float


class PipelineStatusResponse(BaseModel):
    ready: bool
    detection_mode: Literal['yolo', 'mock']
    ocr_mode: Literal['ocr', 'mock']
    processing_runtime: Literal['opencv', 'pillow']
    storage_ready: bool
    store_results: bool
    message: str


class PipelineRunResponse(BaseModel):
    record_id: str | None
    stored: bool
    camera_id: str | None = None
    processing: ProcessingResult
    detection: DetectionResponse
    plate: PlateOCRResponse
    timings: PipelineStageTiming
    pipeline_mode: str
