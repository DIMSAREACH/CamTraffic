"""
CamTraffic AI Service — FastAPI inference API.

Endpoints:
  GET  /health
  POST /detect/image
  POST /detect/video
  POST /detect/webcam
  POST /detect/live
  GET  /classes
"""

from __future__ import annotations

import logging
import time
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import get_settings
from model_loader import is_ready, load_model, model_version
from stream_processor import (
    process_image_bytes,
    process_ip_camera,
    process_video_file,
    process_webcam_frame_bytes,
    save_upload_to_temp,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("ai_service")

settings = get_settings()
ANNOTATED_DIR = Path(__file__).resolve().parent / "outputs" / "annotated"
ANNOTATED_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="CamTraffic AI Service",
    version="1.0.0",
    description="YOLOv8 traffic sign/vehicle detection + plate OCR for Cambodia enforcement",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LiveDetectRequest(BaseModel):
    stream_url: str = Field(..., description="RTSP or HTTP camera URL")
    frames: int = Field(5, ge=1, le=30)


class DetectionResponse(BaseModel):
    detection_id: str
    processing_ms: int
    model_version: str
    mock_mode: bool
    confidence_score: float
    signs: list[dict]
    vehicles: list[dict]
    plates: list[dict]
    violation_suggestions: list[dict]
    annotated_path: str | None = None
    frames_processed: int | None = None


def _validate_upload(file: UploadFile, allowed: set[str], max_mb: int) -> None:
    name = (file.filename or "").lower()
    ext = Path(name).suffix
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'. Allowed: {sorted(allowed)}")
    # size checked after read


def _enforce_size(data: bytes, max_mb: int) -> None:
    if len(data) > max_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {max_mb} MB limit")


def _wrap(result: dict, started: float) -> DetectionResponse:
    return DetectionResponse(
        detection_id=result["detection_id"],
        processing_ms=int((time.perf_counter() - started) * 1000),
        model_version=model_version(settings),
        mock_mode=bool(result.get("mock_mode", settings.ai_mock_mode)),
        confidence_score=float(result.get("confidence_score", 0)),
        signs=result.get("signs", []),
        vehicles=result.get("vehicles", []),
        plates=result.get("plates", []),
        violation_suggestions=result.get("violation_suggestions", []),
        annotated_path=result.get("annotated_path"),
        frames_processed=result.get("frames_processed"),
    )


@app.on_event("startup")
def startup() -> None:
    load_model(settings)
    ready, detail = is_ready(settings)
    logger.info("AI service ready=%s (%s)", ready, detail)


@app.get("/")
def root():
    return {
        "service": "camtraffic-ai-service",
        "version": "1.0.0",
        "docs": "/docs",
        "model_version": model_version(settings),
        "mock_mode": settings.ai_mock_mode,
    }


@app.get("/health")
def health():
    ready, detail = is_ready(settings)
    return {
        "status": "ok" if ready else "degraded",
        "ready": ready,
        "detail": detail,
        "model_version": model_version(settings),
    }


@app.get("/classes")
def classes():
    return {
        "traffic_signs": list(settings.traffic_sign_classes),
        "vehicles": list(settings.vehicle_classes),
    }


@app.post("/detect/image", response_model=DetectionResponse)
async def detect_image(
    file: UploadFile = File(...),
    observed_speed_kmh: float | None = Form(default=None),
):
    _validate_upload(file, {".jpg", ".jpeg", ".png", ".bmp", ".webp"}, settings.ai_max_upload_mb)
    data = await file.read()
    _enforce_size(data, settings.ai_max_upload_mb)
    started = time.perf_counter()
    try:
        result = process_image_bytes(data, settings=settings, annotated_dir=ANNOTATED_DIR)
        if observed_speed_kmh is not None:
            from violation_engine import evaluate_violations

            result["violation_suggestions"] = evaluate_violations(
                result["signs"],
                result["vehicles"],
                result["plates"],
                observed_speed_kmh=observed_speed_kmh,
            )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _wrap(result, started)


@app.post("/detect/video", response_model=DetectionResponse)
async def detect_video(file: UploadFile = File(...)):
    _validate_upload(file, {".mp4", ".avi", ".mov", ".mkv", ".webm"}, settings.ai_max_upload_mb)
    data = await file.read()
    _enforce_size(data, settings.ai_max_upload_mb)
    tmp = save_upload_to_temp(data, Path(file.filename or "video.mp4").suffix or ".mp4")
    started = time.perf_counter()
    try:
        result = process_video_file(tmp, settings=settings)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        tmp.unlink(missing_ok=True)
    return _wrap(result, started)


@app.post("/detect/webcam", response_model=DetectionResponse)
async def detect_webcam(file: UploadFile = File(...)):
    """Accept a single webcam JPEG/PNG frame (multipart)."""
    _validate_upload(file, {".jpg", ".jpeg", ".png", ".webp"}, settings.ai_max_upload_mb)
    data = await file.read()
    _enforce_size(data, settings.ai_max_upload_mb)
    started = time.perf_counter()
    try:
        result = process_webcam_frame_bytes(data, settings=settings)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _wrap(result, started)


@app.post("/detect/live", response_model=DetectionResponse)
async def detect_live(body: LiveDetectRequest):
    started = time.perf_counter()
    try:
        result = process_ip_camera(body.stream_url, frames=body.frames, settings=settings)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _wrap(result, started)


# Alias for uvicorn: `uvicorn api:app`
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api:app",
        host=settings.ai_host,
        port=settings.ai_port,
        reload=False,
    )
