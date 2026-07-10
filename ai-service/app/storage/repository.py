"""File-based detection result repository."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from app.config import STORAGE_DIR
from app.storage.schemas import StoredDetectionRecord, StoredDetectionSummary


class DetectionRepository:
    def __init__(self, storage_dir: Path | None = None) -> None:
        self.storage_dir = storage_dir or STORAGE_DIR
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def is_ready(self) -> bool:
        try:
            self.storage_dir.mkdir(parents=True, exist_ok=True)
            probe = self.storage_dir / '.write_probe'
            probe.write_text('ok', encoding='utf-8')
            probe.unlink(missing_ok=True)
            return True
        except OSError:
            return False

    def count(self) -> int:
        return len(list(self.storage_dir.glob('*.json')))

    def save(self, record: StoredDetectionRecord) -> StoredDetectionRecord:
        path = self.storage_dir / f'{record.id}.json'
        path.write_text(record.model_dump_json(indent=2), encoding='utf-8')
        return record

    def create(
        self,
        *,
        camera_id: str | None,
        processing,
        detection,
        plate,
        total_ms: float,
        pipeline_mode: str,
    ) -> StoredDetectionRecord:
        record = StoredDetectionRecord(
            id=str(uuid4()),
            created_at=datetime.now(UTC),
            camera_id=camera_id,
            processing=processing,
            detection=detection,
            plate=plate,
            total_ms=total_ms,
            pipeline_mode=pipeline_mode,
        )
        return self.save(record)

    def get(self, record_id: str) -> StoredDetectionRecord | None:
        path = self.storage_dir / f'{record_id}.json'
        if not path.is_file():
            return None
        payload = json.loads(path.read_text(encoding='utf-8'))
        return StoredDetectionRecord.model_validate(payload)

    def list_records(
        self,
        *,
        search: str | None = None,
        camera_id: str | None = None,
        limit: int = 50,
    ) -> list[StoredDetectionSummary]:
        summaries: list[StoredDetectionSummary] = []
        for path in sorted(self.storage_dir.glob('*.json'), key=lambda item: item.stat().st_mtime, reverse=True):
            payload = json.loads(path.read_text(encoding='utf-8'))
            record = StoredDetectionRecord.model_validate(payload)
            if camera_id and record.camera_id != camera_id:
                continue

            top_sign_code = None
            if record.detection.detections:
                top_sign_code = record.detection.detections[0].traffic_sign_code

            summary = StoredDetectionSummary(
                id=record.id,
                created_at=record.created_at,
                camera_id=record.camera_id,
                detection_count=record.detection.detection_count,
                plate_text=record.plate.plate_text,
                top_sign_code=top_sign_code,
                total_ms=record.total_ms,
            )

            if search:
                haystack = ' '.join(
                    filter(
                        None,
                        [
                            summary.id,
                            summary.camera_id,
                            summary.plate_text,
                            summary.top_sign_code,
                        ],
                    )
                ).lower()
                if search.lower() not in haystack:
                    continue

            summaries.append(summary)
            if len(summaries) >= limit:
                break

        return summaries


detection_repository = DetectionRepository()
