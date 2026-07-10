"""FastAPI routes for image preprocessing."""

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.processing.schemas import ProcessingResult, ProcessingStatusResponse
from app.processing.service import image_processor

router = APIRouter(prefix='/processing', tags=['processing'])


@router.get('/status', response_model=ProcessingStatusResponse)
async def processing_status() -> ProcessingStatusResponse:
    return image_processor.status()


@router.post('/preprocess', response_model=ProcessingResult)
async def preprocess_image(image: UploadFile = File(...)) -> ProcessingResult:
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
        _, result = image_processor.preprocess(image_bytes)
        return result
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'Unable to preprocess image: {exc}',
        ) from exc
