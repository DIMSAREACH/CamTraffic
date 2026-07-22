"""Response models for OCR API."""

from pydantic import BaseModel, Field


class PlateReadResult(BaseModel):
    plate_text: str = ""
    plate_confidence: float = 0.0
    plate_type: str = "unknown"
    format_valid: bool = False
    ocr_engine: str = "easyocr"
    raw_reads: list[dict] = Field(default_factory=list)
    plate_regions: list[str] = Field(default_factory=list)
    plate_region_found: bool = False
    plate_province_code: str | None = None
    plate_province_en: str | None = None
    plate_province_km: str | None = None
    alternatives: list[dict] = Field(default_factory=list)
    mock_mode: bool = False


class ApiResponse(BaseModel):
    success: bool
    message: str
    data: PlateReadResult | dict | None = None
