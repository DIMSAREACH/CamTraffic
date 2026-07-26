"""Eager-load YOLO models so Detect stays under ~3s after first warm."""
from __future__ import annotations

import logging
import threading
import time

logger = logging.getLogger(__name__)

_WARM_LOCK = threading.Lock()
_WARM_DONE = False
_WARM_ERROR: str | None = None


def models_are_warm() -> bool:
    return _WARM_DONE


def ensure_models_warm(*, include_ocr: bool = False) -> dict:
    """
    Load sign / vehicle / plate YOLO once (thread-safe).
    Safe to call from AppConfig.ready() and from HTTP warmup.
    """
    global _WARM_DONE, _WARM_ERROR
    if _WARM_DONE and not include_ocr:
        return {'warm': True, 'elapsed_sec': 0.0, 'error': None}

    with _WARM_LOCK:
        if _WARM_DONE and not include_ocr:
            return {'warm': True, 'elapsed_sec': 0.0, 'error': None}
        started = time.perf_counter()
        try:
            import numpy as np
            from django.conf import settings

            from .services import _get_sign_model
            from .vehicle_detection import _get_vehicle_model, vehicle_detection_enabled

            sign_model = _get_sign_model()
            vehicle_model = _get_vehicle_model() if vehicle_detection_enabled() else None

            plate_model = None
            from .plate_detection import plate_detect_enabled, _get_model as _get_plate_model

            if plate_detect_enabled():
                plate_model = _get_plate_model()

            if include_ocr:
                from .plate_ocr import plate_ocr_enabled, _get_reader

                if plate_ocr_enabled():
                    _get_reader()

            # Warm up with smaller image for faster initial load
            blank = np.zeros((320, 320, 3), dtype=np.uint8)
            imgsz = int(getattr(settings, 'AI_LIVE_IMGSZ', getattr(settings, 'AI_IMGSZ', 416)))
            warmup_imgsz = 320  # Fast warmup size
            if sign_model is not None:
                sign_model.predict(blank, imgsz=warmup_imgsz, verbose=False, half=False)
            if vehicle_model is not None:
                vehicle_model.predict(blank, imgsz=warmup_imgsz, verbose=False, half=False)
            if plate_model is not None:
                plate_model.predict(blank, imgsz=warmup_imgsz, verbose=False, half=False)

            if getattr(settings, 'AI_CATALOG_VISUAL_MATCH_ENABLED', True):
                from .catalog_visual_match import warmup_catalog_visual_index

                warmup_catalog_visual_index()

            # One full fast pipeline on a real sample so the first user Detect is <3s.
            try:
                from pathlib import Path
                from .pipeline import run_detection_pipeline

                media = Path(settings.MEDIA_ROOT)
                sample = media / 'demo-cameras' / 'monivong-intersection.jpg'
                if not sample.is_file():
                    uploads = media / 'ai' / 'uploads'
                    sample = next(uploads.glob('*.jpg'), None) if uploads.is_dir() else None
                if sample and Path(sample).is_file():
                    run_detection_pipeline(
                        str(sample),
                        original_filename='warmup.jpg',
                        live_fast=True,
                        enable_ocr=False,
                        enable_plate=False,
                        unified_prep=False,
                    )
            except Exception:
                logger.debug('Pipeline warmup sample skipped', exc_info=True)

            _WARM_DONE = True
            _WARM_ERROR = None
            elapsed = round(time.perf_counter() - started, 3)
            logger.info('AI models warm in %.2fs', elapsed)
            return {'warm': True, 'elapsed_sec': elapsed, 'error': None}
        except Exception as exc:
            _WARM_ERROR = str(exc)
            logger.warning('AI model warmup failed', exc_info=True)
            return {
                'warm': False,
                'elapsed_sec': round(time.perf_counter() - started, 3),
                'error': str(exc),
            }
