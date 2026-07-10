"""Pydantic schemas for image processing."""

from typing import Literal

from pydantic import BaseModel


class ProcessingStatusResponse(BaseModel):
    ready: bool
    runtime: Literal['opencv', 'pillow']
    opencv_available: bool
    max_width: int
    message: str


class ProcessingResult(BaseModel):
    original_width: int
    original_height: int
    processed_width: int
    processed_height: int
    resized: bool
    denoised: bool
    runtime: Literal['opencv', 'pillow']
    processing_ms: float
