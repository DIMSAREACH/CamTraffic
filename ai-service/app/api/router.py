"""REST endpoints for detection history."""

from fastapi import APIRouter, HTTPException, Query, status

from app.storage.schemas import StorageListResponse, StoredDetectionRecord
from app.storage.service import storage_service

router = APIRouter(prefix='/api/v1/detections', tags=['detection-history'])


@router.get('/history', response_model=StorageListResponse)
async def list_detection_history(
    search: str | None = Query(default=None),
    camera_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
) -> StorageListResponse:
    return storage_service.list_records(search=search, camera_id=camera_id, limit=limit)


@router.get('/history/{record_id}', response_model=StoredDetectionRecord)
async def get_detection_history(record_id: str) -> StoredDetectionRecord:
    record = storage_service.get_record(record_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Detection record not found.',
        )
    return record
