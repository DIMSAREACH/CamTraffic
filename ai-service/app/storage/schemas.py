"""Pydantic schemas for persisted detection records."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.detection.schemas import DetectionResponse
from app.ocr.schemas import PlateOCRResponse
from app.processing.schemas import ProcessingResult


class StoredDetectionRecord(BaseModel):
    id: str
    created_at: datetime
    camera_id: str | None = None
    processing: ProcessingResult
    detection: DetectionResponse
    plate: PlateOCRResponse
    total_ms: float
    pipeline_mode: str


class StoredDetectionSummary(BaseModel):
    id: str
    created_at: datetime
    camera_id: str | None = None
    detection_count: int
    plate_text: str
    top_sign_code: str | None = None
    total_ms: float


class StorageStatusResponse(BaseModel):
    ready: bool
    storage_dir: str
    record_count: int
    message: str


class StorageListResponse(BaseModel):
    count: int
    results: list[StoredDetectionSummary]
