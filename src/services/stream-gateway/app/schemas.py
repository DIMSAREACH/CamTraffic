"""API schemas."""

from pydantic import BaseModel, Field


class StreamStartRequest(BaseModel):
    camera_id: str
    rtsp_url: str
    fps: int = Field(default=5, ge=1, le=30)


class StreamStatus(BaseModel):
    camera_id: str
    status: str
    rtsp_url: str = ""
    fps_target: int = 0
    fps_actual: float = 0.0
    frame_count: int = 0
    last_frame_at: str | None = None
    last_error: str | None = None
    mock_mode: bool = False


class ApiResponse(BaseModel):
    success: bool
    message: str
    data: StreamStatus | dict | None = None
