"""Eager-load YOLO models so Detect stays under ~3s after first warm."""
from __future__ import annotations

import logging
import threading
import time

logger = logging.getLogger(__name__)

_WARM_LOCK = threading.Lock()
_WARM_DONE = False
_WARM_ERROR: str | None = None
_WARM_DETAILS: dict | None = None


def models_are_warm() -> bool:
    return _WARM_DONE


def last_warmup_error() -> str | None:
    return _WARM_ERROR


def ensure_models_warm(*, include_ocr: bool = False) -> dict:
    """
    Load sign / vehicle / plate / helmet YOLO once (thread-safe).
    Safe to call from AppConfig.ready() and from HTTP warmup.
    """
    global _WARM_DONE, _WARM_ERROR, _WARM_DETAILS
    if _WARM_DONE and not include_ocr:
        from .model_readiness import build_model_readiness

        payload = build_model_readiness(warm=True, warm_error=None)
        payload.update({'warm': True, 'elapsed_sec': 0.0, 'error': None, 'details': _WARM_DETAILS})
        return payload

    with _WARM_LOCK:
        if _WARM_DONE and not include_ocr:
            from .model_readiness import build_model_readiness

            payload = build_model_readiness(warm=True, warm_error=None)
            payload.update({'warm': True, 'elapsed_sec': 0.0, 'error': None, 'details': _WARM_DETAILS})
            return payload
        started = time.perf_counter()
        details: dict = {'sign': False, 'vehicle': False, 'plate': False, 'helmet': False, 'ocr': False}
        try:
            import numpy as np
            from django.conf import settings

            from .services import _get_sign_model, _sign_model_class_count
            from .vehicle_detection import _get_vehicle_model, vehicle_detection_enabled
            from .model_readiness import build_model_readiness, sign_model_path

            disk = build_model_readiness(warm=False)
            if not disk.get('models_on_disk'):
                _WARM_ERROR = '; '.join(disk.get('advice') or ['Required AI weights missing'])
                return {
                    **disk,
                    'warm': False,
                    'elapsed_sec': round(time.perf_counter() - started, 3),
                    'error': _WARM_ERROR,
                }

            sign_model = _get_sign_model()
            details['sign'] = sign_model is not None
            details['sign_classes'] = _sign_model_class_count()
            details['sign_path'] = str(sign_model_path())

            vehicle_model = _get_vehicle_model() if vehicle_detection_enabled() else None
            details['vehicle'] = vehicle_model is not None

            plate_model = None
            from .plate_detection import plate_detect_enabled, _get_model as _get_plate_model

            if plate_detect_enabled():
                plate_model = _get_plate_model()
            details['plate'] = plate_model is not None

            helmet_model = None
            from .helmet_detection import helmet_detection_enabled, _get_helmet_model

            if helmet_detection_enabled():
                helmet_model = _get_helmet_model()
            details['helmet'] = helmet_model is not None

            if include_ocr:
                from .plate_ocr import plate_ocr_enabled, _get_reader

                if plate_ocr_enabled():
                    _get_reader()
                    details['ocr'] = True

            blank = np.zeros((320, 320, 3), dtype=np.uint8)
            warmup_imgsz = 320
            if sign_model is not None:
                sign_model.predict(blank, imgsz=warmup_imgsz, verbose=False)
            if vehicle_model is not None:
                vehicle_model.predict(blank, imgsz=warmup_imgsz, verbose=False)
            if plate_model is not None:
                plate_model.predict(blank, imgsz=warmup_imgsz, verbose=False)
            if helmet_model is not None:
                helmet_model.predict(blank, imgsz=warmup_imgsz, verbose=False)

            if getattr(settings, 'AI_CATALOG_VISUAL_MATCH_ENABLED', True):
                from .catalog_visual_match import warmup_catalog_visual_index

                warmup_catalog_visual_index()

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

            if not details['sign']:
                raise RuntimeError(
                    f'Sign YOLO failed to load from {details.get("sign_path")}. '
                    'Check AI_MODEL_PATH and ai/weights/best.pt.'
                )

            _WARM_DONE = True
            _WARM_ERROR = None
            _WARM_DETAILS = details
            elapsed = round(time.perf_counter() - started, 3)
            logger.info(
                'AI models warm in %.2fs (sign_classes=%s vehicle=%s plate=%s helmet=%s)',
                elapsed,
                details.get('sign_classes'),
                details['vehicle'],
                details['plate'],
                details['helmet'],
            )
            payload = build_model_readiness(warm=True, warm_error=None)
            payload.update({
                'warm': True,
                'elapsed_sec': elapsed,
                'error': None,
                'details': details,
            })
            return payload
        except Exception as exc:
            _WARM_ERROR = str(exc)
            logger.warning('AI model warmup failed', exc_info=True)
            from .model_readiness import build_model_readiness

            payload = build_model_readiness(warm=False, warm_error=str(exc))
            payload.update({
                'warm': False,
                'elapsed_sec': round(time.perf_counter() - started, 3),
                'error': str(exc),
                'details': details,
            })
            return payload
