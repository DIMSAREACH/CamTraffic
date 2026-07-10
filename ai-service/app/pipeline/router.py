"""FastAPI routes for the detection pipeline."""

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.metrics.collector import metrics_collector
from app.pipeline.schemas import PipelineRunResponse, PipelineStatusResponse
from app.pipeline.service import pipeline_service

router = APIRouter(prefix='/pipeline', tags=['pipeline'])


@router.get('/status', response_model=PipelineStatusResponse)
async def pipeline_status() -> PipelineStatusResponse:
    return pipeline_service.status()


@router.post('/run', response_model=PipelineRunResponse)
async def run_pipeline(
    image: UploadFile = File(...),
    camera_id: str | None = Form(default=None),
    store: bool = Form(default=True),
) -> PipelineRunResponse:
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
        return pipeline_service.run(image_bytes, camera_id=camera_id, store=store)
    except Exception as exc:
        metrics_collector.record_failure()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'Pipeline failed: {exc}',
        ) from exc
