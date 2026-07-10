"""Pydantic schemas for OCR."""

from typing import Literal

from pydantic import BaseModel


class OCRStatusResponse(BaseModel):
    ready: bool
    mode: Literal['ocr', 'mock']
    easyocr_available: bool
    languages: list[str]
    message: str


class OCRTextItem(BaseModel):
    text: str
    confidence: float


class OCRResponse(BaseModel):
    mode: Literal['ocr', 'mock']
    texts: list[OCRTextItem]
    primary_text: str
    primary_confidence: float
    inference_ms: float


class PlateOCRResponse(BaseModel):
    mode: Literal['ocr', 'mock']
    plate_text: str
    confidence: float
    inference_ms: float
