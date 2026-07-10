"""FastAPI routes for YOLOv11 detection."""

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.detection.schemas import DetectionResponse, DetectionStatusResponse
from app.detection.service import detection_service

router = APIRouter(prefix='/detection', tags=['detection'])


@router.get('/status', response_model=DetectionStatusResponse)
async def detection_status() -> DetectionStatusResponse:
    return detection_service.status()


@router.post('/detect', response_model=DetectionResponse)
async def detect_traffic_signs(image: UploadFile = File(...)) -> DetectionResponse:
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

    try:
        return detection_service.detect_image_bytes(image_bytes)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'Unable to process image: {exc}',
        ) from exc
