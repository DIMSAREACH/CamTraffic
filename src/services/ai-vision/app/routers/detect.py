"""Detection endpoints."""

import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, UploadFile

from app.schemas import ApiResponse
from app.services.detector import run_detection

router = APIRouter(prefix="/api/v1/ai", tags=["AI Vision"])


@router.post("/detect/", response_model=ApiResponse)
async def detect(
    image: UploadFile = File(...),
    camera_id: str | None = Form(default=None),
    enable_tracking: bool = Form(default=False),
):
    suffix = Path(image.filename or "upload.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await image.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        result = run_detection(tmp_path, enable_ocr=True)
        if camera_id:
            result = result.model_copy(update={"detection_id": result.detection_id})
        return ApiResponse(success=True, message="Detection complete", data=result)
    finally:
        tmp_path.unlink(missing_ok=True)
