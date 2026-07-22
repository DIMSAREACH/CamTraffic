"""OCR API routes."""

import json
import tempfile
from pathlib import Path

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, UploadFile

from app.schemas import ApiResponse
from app.services.plate_reader import read_plate_from_crop, read_plate_from_frame

router = APIRouter(prefix="/api/v1/ocr", tags=["OCR"])


@router.post("/read/", response_model=ApiResponse)
async def read_crop(image: UploadFile = File(...)):
    """OCR a plate crop image."""
    content = await image.read()
    arr = np.frombuffer(content, dtype=np.uint8)
    image_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image_bgr is None:
        return ApiResponse(success=False, message="Invalid image")
    result = read_plate_from_crop(image_bgr)
    return ApiResponse(success=True, message="OCR complete", data=result)


@router.post("/read-frame/", response_model=ApiResponse)
async def read_frame(
    image: UploadFile = File(...),
    vehicles: str = Form(default="[]"),
):
    """OCR plate from full frame; optional vehicle bboxes JSON."""
    suffix = Path(image.filename or "frame.jpg").suffix or ".jpg"
    vehicle_list: list[dict] = []
    try:
        vehicle_list = json.loads(vehicles or "[]")
        if not isinstance(vehicle_list, list):
            vehicle_list = []
    except json.JSONDecodeError:
        vehicle_list = []

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await image.read())
        tmp_path = Path(tmp.name)

    try:
        result = read_plate_from_frame(tmp_path, vehicle_list)
        return ApiResponse(success=True, message="OCR complete", data=result)
    finally:
        tmp_path.unlink(missing_ok=True)
