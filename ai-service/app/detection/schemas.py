"""Pydantic schemas for YOLOv11 detection requests and responses."""

from typing import Literal

from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class DetectionItem(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    bounding_box: BoundingBox
    traffic_sign_code: str | None = None


class DetectionResponse(BaseModel):
    detections: list[DetectionItem]
    detection_count: int
    mode: Literal['yolo', 'mock']
    model_path: str
    confidence_threshold: float
    inference_ms: float
    image_width: int
    image_height: int


class DetectionStatusResponse(BaseModel):
    ready: bool
    mode: Literal['yolo', 'mock']
    model_path: str
    weights_found: bool
    ultralytics_available: bool
    confidence_threshold: float
    device: str
    class_count: int | None = None
    message: str


class DetectionErrorResponse(BaseModel):
    detail: str
