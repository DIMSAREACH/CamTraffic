"""YOLOv11 traffic sign detection service."""

from __future__ import annotations

import time
from io import BytesIO

import numpy as np
from PIL import Image

from app.config import CONFIDENCE_THRESHOLD, YOLO_DEVICE, YOLO_WEIGHTS_PATH
from app.detection.constants import resolve_sign_code
from app.detection.model_loader import (
    detection_status_message,
    get_model,
    is_ready,
    should_use_mock,
    ultralytics_available,
    weights_found,
)
from app.detection.schemas import BoundingBox, DetectionItem, DetectionResponse, DetectionStatusResponse


class YOLODetectionService:
    def status(self) -> DetectionStatusResponse:
        mode = 'mock' if should_use_mock() else 'yolo'
        class_count: int | None = None

        if mode == 'yolo':
            try:
                loaded = get_model()
                class_count = len(loaded.class_names)
            except (FileNotFoundError, RuntimeError):
                class_count = None

        return DetectionStatusResponse(
            ready=is_ready(),
            mode=mode,
            model_path=str(YOLO_WEIGHTS_PATH),
            weights_found=weights_found(),
            ultralytics_available=ultralytics_available(),
            confidence_threshold=CONFIDENCE_THRESHOLD,
            device=YOLO_DEVICE,
            class_count=class_count,
            message=detection_status_message(),
        )

    def detect_image_bytes(self, image_bytes: bytes) -> DetectionResponse:
        image = Image.open(BytesIO(image_bytes)).convert('RGB')
        width, height = image.size

        started = time.perf_counter()
        if should_use_mock():
            detections = self._mock_detections(width, height)
            mode = 'mock'
        else:
            detections = self._run_yolo(image)
            mode = 'yolo'
        inference_ms = (time.perf_counter() - started) * 1000

        return DetectionResponse(
            detections=detections,
            detection_count=len(detections),
            mode=mode,
            model_path=str(YOLO_WEIGHTS_PATH),
            confidence_threshold=CONFIDENCE_THRESHOLD,
            inference_ms=round(inference_ms, 2),
            image_width=width,
            image_height=height,
        )

    def _run_yolo(self, image: Image.Image) -> list[DetectionItem]:
        loaded = get_model()
        results = loaded.model.predict(
            source=np.array(image),
            conf=CONFIDENCE_THRESHOLD,
            device=YOLO_DEVICE,
            verbose=False,
        )

        detections: list[DetectionItem] = []
        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                x1, y1, x2, y2 = [float(value) for value in box.xyxy[0].tolist()]
                class_name = loaded.class_names.get(class_id, str(class_id))
                detections.append(
                    DetectionItem(
                        class_id=class_id,
                        class_name=class_name,
                        confidence=round(confidence, 4),
                        bounding_box=BoundingBox(x1=x1, y1=y1, x2=x2, y2=y2),
                        traffic_sign_code=resolve_sign_code(class_name),
                    )
                )

        detections.sort(key=lambda item: item.confidence, reverse=True)
        return detections

    def _mock_detections(self, width: int, height: int) -> list[DetectionItem]:
        box_width = max(48, int(width * 0.18))
        box_height = max(48, int(height * 0.18))
        x1 = max(0, int((width - box_width) / 2))
        y1 = max(0, int((height - box_height) / 2))
        x2 = min(width, x1 + box_width)
        y2 = min(height, y1 + box_height)

        return [
            DetectionItem(
                class_id=0,
                class_name='stop',
                confidence=0.91,
                bounding_box=BoundingBox(x1=float(x1), y1=float(y1), x2=float(x2), y2=float(y2)),
                traffic_sign_code='P-001',
            )
        ]


detection_service = YOLODetectionService()
