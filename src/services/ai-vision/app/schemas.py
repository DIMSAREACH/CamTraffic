"""Pydantic response models aligned with docs/enterprise/openapi.yaml."""

from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class SignDetection(BaseModel):
    class_name: str = Field(serialization_alias="class")
    confidence: float
    bbox: list[float]
    sign_code: str | None = None

    model_config = {"populate_by_name": True}


class VehicleDetection(BaseModel):
    class_name: str = Field(serialization_alias="class")
    confidence: float
    bbox: list[float]
    track_id: str | None = None

    model_config = {"populate_by_name": True}


class PlateDetection(BaseModel):
    text: str
    confidence: float
    bbox: list[float]
    format_valid: bool = False


class BehaviorDetection(BaseModel):
    type: str
    confidence: float
    bbox: list[float]


class ViolationSuggestion(BaseModel):
    violation_type: str
    rule_id: str | None = None
    auto_eligible: bool = False
    suggested_fine_khr: int | None = None


class DetectionResult(BaseModel):
    detection_id: str
    processing_ms: int
    model_version: str
    mock_mode: bool = False
    signs: list[SignDetection] = Field(default_factory=list)
    vehicles: list[VehicleDetection] = Field(default_factory=list)
    plates: list[PlateDetection] = Field(default_factory=list)
    behaviors: list[BehaviorDetection] = Field(default_factory=list)
    violation_suggestions: list[ViolationSuggestion] = Field(default_factory=list)


class ApiResponse(BaseModel):
    success: bool
    message: str
    data: DetectionResult | dict | None = None
