"""FastAPI routes for OCR."""

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.ocr.schemas import OCRResponse, OCRStatusResponse, PlateOCRResponse
from app.ocr.service import ocr_service

router = APIRouter(prefix='/ocr', tags=['ocr'])


@router.get('/status', response_model=OCRStatusResponse)
async def ocr_status() -> OCRStatusResponse:
    return ocr_service.status()


@router.post('/recognize', response_model=OCRResponse)
async def recognize_text(image: UploadFile = File(...)) -> OCRResponse:
    image_bytes = await _read_image(image)
    try:
        return ocr_service.recognize_text(image_bytes)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.post('/plate', response_model=PlateOCRResponse)
async def recognize_plate(image: UploadFile = File(...)) -> PlateOCRResponse:
    image_bytes = await _read_image(image)
    try:
        return ocr_service.recognize_plate(image_bytes)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


async def _read_image(image: UploadFile) -> bytes:
    if not image.content_type or not image.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Upload must be an image file.',
        )

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Uploaded image is empty.',
        )
    return image_bytes
