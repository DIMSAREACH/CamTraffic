"""Stream control API."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.schemas import ApiResponse, StreamStartRequest, StreamStatus
from app.services.stream_manager import stream_manager

router = APIRouter(prefix="/api/v1/streams", tags=["Streams"])


@router.get("/", response_model=ApiResponse)
async def list_streams():
    return ApiResponse(
        success=True,
        message="OK",
        data={"streams": [item.model_dump() for item in stream_manager.list_statuses()]},
    )


@router.get("/cameras/{camera_id}/status/", response_model=ApiResponse)
async def stream_status(camera_id: str):
    status = stream_manager.get_status(camera_id)
    if not status:
        status = StreamStatus(camera_id=camera_id, status="stopped")
    return ApiResponse(success=True, message="OK", data=status)


@router.post("/cameras/{camera_id}/start/", response_model=ApiResponse)
async def start_stream(camera_id: str, body: StreamStartRequest):
    if body.camera_id != camera_id:
        raise HTTPException(status_code=400, detail="camera_id mismatch")
    session = stream_manager.start_stream(camera_id, body.rtsp_url, body.fps)
    return ApiResponse(success=True, message="Stream started", data=session.to_status())


@router.post("/cameras/{camera_id}/stop/", response_model=ApiResponse)
async def stop_stream(camera_id: str):
    status = stream_manager.stop_stream(camera_id)
    if not status:
        return ApiResponse(
            success=True,
            message="Stream was not running",
            data=StreamStatus(camera_id=camera_id, status="stopped"),
        )
    return ApiResponse(success=True, message="Stream stopped", data=status)


@router.get("/cameras/{camera_id}/snapshot/")
async def snapshot(camera_id: str, rtsp_url: str = ""):
    jpeg = stream_manager.capture_snapshot(camera_id, rtsp_url=rtsp_url or None)
    if not jpeg:
        raise HTTPException(status_code=502, detail="Could not capture snapshot")
    return Response(content=jpeg, media_type="image/jpeg")
