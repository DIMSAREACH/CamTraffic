"""Detection result storage service."""

from app.config import STORAGE_DIR
from app.storage.repository import DetectionRepository, detection_repository
from app.storage.schemas import StorageListResponse, StorageStatusResponse, StoredDetectionRecord


class StorageService:
    def __init__(self, repository: DetectionRepository | None = None) -> None:
        self.repository = repository or detection_repository

    def status(self) -> StorageStatusResponse:
        ready = self.repository.is_ready()
        return StorageStatusResponse(
            ready=ready,
            storage_dir=str(STORAGE_DIR),
            record_count=self.repository.count(),
            message='Detection storage is writable.' if ready else 'Detection storage is unavailable.',
        )

    def save_pipeline_result(
        self,
        *,
        camera_id: str | None,
        processing,
        detection,
        plate,
        total_ms: float,
        pipeline_mode: str,
    ) -> StoredDetectionRecord:
        return self.repository.create(
            camera_id=camera_id,
            processing=processing,
            detection=detection,
            plate=plate,
            total_ms=total_ms,
            pipeline_mode=pipeline_mode,
        )

    def get_record(self, record_id: str) -> StoredDetectionRecord | None:
        return self.repository.get(record_id)

    def list_records(
        self,
        *,
        search: str | None = None,
        camera_id: str | None = None,
        limit: int = 50,
    ) -> StorageListResponse:
        results = self.repository.list_records(search=search, camera_id=camera_id, limit=limit)
        return StorageListResponse(count=len(results), results=results)


storage_service = StorageService()
