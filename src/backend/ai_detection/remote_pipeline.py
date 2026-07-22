"""Map ai-vision-service responses into Django pipeline format."""

from __future__ import annotations

import logging
import time
from pathlib import Path

from django.conf import settings

from .plate_ocr import classify_plate_type, enrich_plate_result, link_plate_to_vehicle
from .remote_client import detect_via_vision_service
from .result_compose import compose_detection_payload
from .services import (
    _enrich_from_database,
    _ensure_khmer_speech,
    _resolve_official_sign_labels,
    _result_from_class_key,
)

logger = logging.getLogger(__name__)


def _empty_plate_result() -> dict:
    return {
        'plate_text': '',
        'plate_confidence': 0.0,
        'plate_type': '',
        'ocr_engine': 'none',
        'raw_reads': [],
        'plate_regions': [],
        'plate_region_found': False,
        'matched_vehicle': None,
    }


def _image_size(image_path: str) -> tuple[float, float]:
    try:
        import cv2

        image = cv2.imread(image_path)
        if image is not None:
            height, width = image.shape[:2]
            return float(width), float(height)
    except Exception as exc:
        logger.debug('Could not read image dimensions: %s', exc)
    return 1.0, 1.0


def _class_name(item: dict) -> str:
    return str(item.get('class') or item.get('class_name') or '').strip()


def _normalize_bbox(bbox: list[float], img_w: float, img_h: float) -> dict[str, float]:
    x1, y1, x2, y2 = (float(v) for v in bbox[:4])
    if img_w <= 0 or img_h <= 0:
        return {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2}
    return {
        'x1': round(x1 / img_w, 4),
        'y1': round(y1 / img_h, 4),
        'x2': round(x2 / img_w, 4),
        'y2': round(y2 / img_h, 4),
    }


def _map_vehicles(remote_vehicles: list[dict], img_w: float, img_h: float) -> list[dict]:
    vehicles: list[dict] = []
    for item in remote_vehicles or []:
        class_name = _class_name(item) or 'car'
        confidence = float(item.get('confidence') or 0)
        if confidence <= 1.0:
            confidence *= 100.0
        bbox = item.get('bbox') or [0, 0, 0, 0]
        entry = {
            'vehicle_type': class_name,
            'label': class_name.replace('_', ' ').title(),
            'confidence': round(confidence, 1),
            'bbox': _normalize_bbox(bbox, img_w, img_h),
        }
        track_id = item.get('track_id')
        if track_id:
            entry['track_id'] = track_id
        vehicles.append(entry)
    vehicles.sort(key=lambda row: row['confidence'], reverse=True)
    return vehicles


def _unknown_sign_result(processing_ms: int, model_version: str) -> dict:
    return {
        'sign_name': 'ស្លាកមិនស្គាល់',
        'sign_name_en': 'Unknown sign',
        'sign_name_km': 'ស្លាកមិនស្គាល់',
        'description': 'មិនអាចរកឃើញស្លាកចរាចរណ៍បានច្បាស់លាស់។',
        'description_en': 'Could not detect a traffic sign clearly.',
        'guidance': 'ព្យាយាមម្តងទៀតជាមួយរូបភាពច្បាស់។',
        'guidance_en': 'Try again with a clearer photo.',
        'confidence': 0.0,
        'class_key': '',
        'sign_code': '',
        'detection_engine': f'ai-vision-service/{model_version}',
        'processing_time': round(processing_ms / 1000.0, 3),
        'detection_mode': 'no_sign',
    }


def _map_sign_result(
    remote_signs: list[dict],
    *,
    processing_ms: int,
    model_version: str,
    catalog_sign_code: str = '',
) -> dict:
    if catalog_sign_code:
        result = _result_from_class_key(catalog_sign_code, confidence=90.0)
    elif remote_signs:
        top = max(remote_signs, key=lambda row: float(row.get('confidence') or 0))
        class_name = _class_name(top)
        confidence = float(top.get('confidence') or 0)
        if confidence <= 1.0:
            confidence *= 100.0
        result = _result_from_class_key(class_name or 'unknown', confidence=confidence)
        if top.get('sign_code'):
            result['sign_code'] = top['sign_code']
        result['yolo_debug'] = {
            'class_key': class_name,
            'confidence': confidence,
            'sign_bbox': top.get('bbox'),
        }
    else:
        return _unknown_sign_result(processing_ms, model_version)

    result['detection_engine'] = f'ai-vision-service/{model_version}'
    result['processing_time'] = round(processing_ms / 1000.0, 3)
    result = _enrich_from_database(result)
    result = _resolve_official_sign_labels(result)
    return _ensure_khmer_speech(result)


def _map_plate_result(remote_plates: list[dict]) -> dict:
    if not remote_plates:
        return _empty_plate_result()

    top = max(remote_plates, key=lambda row: float(row.get('confidence') or 0))
    plate_text = (top.get('text') or '').strip()
    if not plate_text:
        return _empty_plate_result()

    confidence = float(top.get('confidence') or 0)
    result = {
        'plate_text': plate_text,
        'plate_confidence': confidence,
        'plate_type': classify_plate_type(plate_text),
        'ocr_engine': 'ai-vision-service',
        'raw_reads': [{'text': plate_text, 'confidence': confidence, 'region': 'remote'}],
        'plate_regions': ['remote_vehicle_bbox'],
        'plate_region_found': True,
        'matched_vehicle': link_plate_to_vehicle(plate_text),
    }
    return enrich_plate_result(plate_text, result)


def map_remote_envelope_to_pipeline(
    envelope: dict,
    *,
    sign_only: bool = False,
    catalog_sign_code: str = '',
    track_session: str = '',
    image_path: str = '',
) -> dict:
    """Convert ai-vision-service JSON envelope to run_detection_pipeline output shape."""
    data = envelope.get('data') or {}
    img_w, img_h = _image_size(image_path) if image_path else (1.0, 1.0)

    processing_ms = int(data.get('processing_ms') or 0)
    model_version = str(data.get('model_version') or 'unknown')

    sign_result = _map_sign_result(
        data.get('signs') or [],
        processing_ms=processing_ms,
        model_version=model_version,
        catalog_sign_code=catalog_sign_code,
    )

    vehicles: list[dict] = []
    plate_result = _empty_plate_result()
    if not sign_only:
        vehicles = _map_vehicles(data.get('vehicles') or [], img_w, img_h)
        plate_result = _map_plate_result(data.get('plates') or [])

    payload = compose_detection_payload(sign_result, vehicles, plate_result)
    payload['remote_detection'] = True
    payload['remote_detection_id'] = data.get('detection_id')
    payload['remote_mock_mode'] = bool(data.get('mock_mode'))

    from .pipeline import _vehicle_summary

    vehicle_summary = _vehicle_summary(vehicles, plate_result)
    if vehicle_summary:
        payload['pipeline_vehicle'] = vehicle_summary
    if track_session:
        payload['track_session'] = track_session
        from .vehicle_tracking import vehicle_tracking_enabled

        payload['vehicle_tracking_enabled'] = vehicle_tracking_enabled()

    return {
        'sign_result': sign_result,
        'vehicles': vehicles,
        'plate_result': plate_result,
        'vehicle_summary': vehicle_summary,
        'payload': payload,
        'track_session': track_session,
    }


def run_remote_detection_pipeline(
    detect_path: str,
    *,
    original_filename: str = '',
    sign_only: bool = False,
    catalog_sign_code: str = '',
    track_session: str = '',
    live_fast: bool = False,
    unified_prep: bool = False,
) -> dict:
    """Call ai-vision-service and return the same dict shape as run_detection_pipeline."""
    del original_filename, live_fast, unified_prep  # reserved for future remote options

    started = time.perf_counter()
    envelope = detect_via_vision_service(detect_path)
    if not envelope.get('success'):
        message = envelope.get('message') or 'Remote detection failed'
        raise RuntimeError(message)

    result = map_remote_envelope_to_pipeline(
        envelope,
        sign_only=sign_only,
        catalog_sign_code=catalog_sign_code,
        track_session=track_session,
        image_path=detect_path,
    )
    elapsed = round(time.perf_counter() - started, 3)
    result['sign_result']['processing_time'] = elapsed
    result['payload']['processing_time'] = elapsed
    result['payload']['detection_engine'] = result['sign_result'].get('detection_engine', 'ai-vision-service')
    return result
