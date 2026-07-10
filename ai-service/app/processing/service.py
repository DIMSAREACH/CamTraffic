"""OpenCV/Pillow image preprocessing utilities."""

from __future__ import annotations

import time
from io import BytesIO
from typing import Any

import numpy as np
from PIL import Image

from app.config import PROCESSING_MAX_WIDTH
from app.processing.schemas import ProcessingResult, ProcessingStatusResponse

_cv2: Any | None = None
_cv2_import_error: str | None = None


def opencv_available() -> bool:
    global _cv2, _cv2_import_error
    if _cv2 is not None:
        return True
    try:
        import cv2

        _cv2 = cv2
        _cv2_import_error = None
        return True
    except ImportError as exc:
        _cv2_import_error = str(exc)
        return False


def opencv_error() -> str | None:
    opencv_available()
    return _cv2_import_error


def runtime_name() -> str:
    return 'opencv' if opencv_available() else 'pillow'


class ImageProcessor:
    def status(self) -> ProcessingStatusResponse:
        runtime = runtime_name()
        return ProcessingStatusResponse(
            ready=True,
            runtime=runtime,
            opencv_available=opencv_available(),
            max_width=PROCESSING_MAX_WIDTH,
            message=(
                'OpenCV preprocessing is available.'
                if opencv_available()
                else 'OpenCV is unavailable; using Pillow fallback preprocessing.'
            ),
        )

    def preprocess(self, image_bytes: bytes) -> tuple[bytes, ProcessingResult]:
        started = time.perf_counter()
        if opencv_available():
            processed_bytes, metadata = self._preprocess_opencv(image_bytes)
            runtime = 'opencv'
        else:
            processed_bytes, metadata = self._preprocess_pillow(image_bytes)
            runtime = 'pillow'

        processing_ms = (time.perf_counter() - started) * 1000
        result = ProcessingResult(
            original_width=metadata['original_width'],
            original_height=metadata['original_height'],
            processed_width=metadata['processed_width'],
            processed_height=metadata['processed_height'],
            resized=metadata['resized'],
            denoised=metadata['denoised'],
            runtime=runtime,
            processing_ms=round(processing_ms, 2),
        )
        return processed_bytes, result

    def crop_bbox(self, image_bytes: bytes, x1: float, y1: float, x2: float, y2: float) -> bytes:
        image = Image.open(BytesIO(image_bytes)).convert('RGB')
        width, height = image.size
        left = max(0, min(width, int(x1)))
        top = max(0, min(height, int(y1)))
        right = max(left + 1, min(width, int(x2)))
        bottom = max(top + 1, min(height, int(y2)))
        cropped = image.crop((left, top, right, bottom))
        return self._image_to_jpeg_bytes(cropped)

    def extract_plate_region(self, image_bytes: bytes, region_ratio: float = 0.3) -> bytes:
        image = Image.open(BytesIO(image_bytes)).convert('RGB')
        width, height = image.size
        top = int(height * (1 - region_ratio))
        plate_region = image.crop((0, top, width, height))
        return self._image_to_jpeg_bytes(plate_region)

    def _preprocess_opencv(self, image_bytes: bytes) -> tuple[bytes, dict[str, int | bool]]:
        cv2 = _cv2
        assert cv2 is not None

        np_buffer = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(np_buffer, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError('Unable to decode image bytes.')

        original_height, original_width = image.shape[:2]
        resized = False
        denoised = False

        if original_width > PROCESSING_MAX_WIDTH:
            scale = PROCESSING_MAX_WIDTH / original_width
            new_width = PROCESSING_MAX_WIDTH
            new_height = max(1, int(original_height * scale))
            image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
            resized = True

        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = cv2.fastNlMeansDenoisingColored(image, None, 5, 5, 7, 21)
        denoised = True

        processed_height, processed_width = image.shape[:2]
        pil_image = Image.fromarray(image)
        return self._image_to_jpeg_bytes(pil_image), {
            'original_width': original_width,
            'original_height': original_height,
            'processed_width': processed_width,
            'processed_height': processed_height,
            'resized': resized,
            'denoised': denoised,
        }

    def _preprocess_pillow(self, image_bytes: bytes) -> tuple[bytes, dict[str, int | bool]]:
        image = Image.open(BytesIO(image_bytes)).convert('RGB')
        original_width, original_height = image.size
        resized = False

        if original_width > PROCESSING_MAX_WIDTH:
            scale = PROCESSING_MAX_WIDTH / original_width
            new_width = PROCESSING_MAX_WIDTH
            new_height = max(1, int(original_height * scale))
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            resized = True

        processed_width, processed_height = image.size
        return self._image_to_jpeg_bytes(image), {
            'original_width': original_width,
            'original_height': original_height,
            'processed_width': processed_width,
            'processed_height': processed_height,
            'resized': resized,
            'denoised': False,
        }

    @staticmethod
    def _image_to_jpeg_bytes(image: Image.Image) -> bytes:
        buffer = BytesIO()
        image.save(buffer, format='JPEG', quality=90)
        return buffer.getvalue()


image_processor = ImageProcessor()
