"""Ordered AI detection pipeline: upload → vehicle → plate → OCR → display → save."""

from __future__ import annotations

import time

from django.conf import settings

from .plate_ocr import plate_ocr_enabled, recognize_plate
from .result_compose import VEHICLE_LABELS_KM, compose_detection_payload
from .services import _is_live_capture_filename, detect_traffic_sign
from .vehicle_detection import detect_vehicles, vehicle_detection_enabled

PIPELINE_STEP_IDS = (
    'upload',
    'vehicle_detect',
    'plate_detect',
    'plate_ocr',
    'show_vehicle',
    'show_plate',
    'violation_check',
    'evidence_capture',
    'save_record',
)


def _vehicle_summary(vehicles: list[dict], plate_result: dict | None) -> dict | None:
    if vehicles:
        top = vehicles[0]
        vtype = top.get('vehicle_type', '')
        label_en = top.get('label', 'Vehicle')
        return {
            'vehicle_type': vtype,
            'vehicle_label_en': label_en,
            'vehicle_label_km': VEHICLE_LABELS_KM.get(vtype, label_en),
            'vehicle_confidence': float(top.get('confidence') or 0),
            'source': 'yolo',
        }
    matched = (plate_result or {}).get('matched_vehicle')
    if matched:
        vtype = matched.get('vehicle_type', 'car')
        label_en = vtype.replace('_', ' ').title() if vtype else 'Vehicle'
        return {
            'vehicle_type': vtype,
            'vehicle_label_en': label_en,
            'vehicle_label_km': VEHICLE_LABELS_KM.get(vtype, label_en),
            'vehicle_confidence': 0.0,
            'source': 'database',
        }
    return None


def _step(
    step_id: str,
    *,
    status: str,
    detail_en: str = '',
    detail_km: str = '',
    confidence: float | None = None,
) -> dict:
    item = {
        'id': step_id,
        'status': status,
        'detail_en': detail_en,
        'detail_km': detail_km,
    }
    if confidence is not None:
        item['confidence'] = round(float(confidence), 1)
    return item


def build_pipeline_steps(
    *,
    vehicles: list[dict],
    plate_result: dict,
    vehicle_summary: dict | None,
    log_id: int | None = None,
    violation_evaluation: dict | None = None,
    violation_id: int | None = None,
    evidence_saved: bool = False,
) -> list[dict]:
    plate_text = (plate_result or {}).get('plate_text') or ''
    plate_conf = float((plate_result or {}).get('plate_confidence') or 0)
    regions = (plate_result or {}).get('plate_regions') or []
    ocr_enabled = plate_ocr_enabled()

    steps = [
        _step('upload', status='complete', detail_en='Image received', detail_km='បានទទួលរូបភាព'),
    ]

    if vehicles:
        top = vehicles[0]
        steps.append(_step(
            'vehicle_detect',
            status='complete',
            detail_en=f"{top.get('label', 'Vehicle')} ({float(top.get('confidence') or 0):.1f}%)",
            detail_km=f"{VEHICLE_LABELS_KM.get(top.get('vehicle_type', ''), top.get('label', 'រថយន្ត'))} "
                       f"({float(top.get('confidence') or 0):.1f}%)",
            confidence=float(top.get('confidence') or 0),
        ))
    elif vehicle_detection_enabled():
        steps.append(_step(
            'vehicle_detect',
            status='empty',
            detail_en='No vehicle in frame (plate OCR still runs)',
            detail_km='គ្មានរថយន្តក្នុងរូប (OCR ផ្លាកនៅតែដំណើរការ)',
        ))
    else:
        steps.append(_step(
            'vehicle_detect',
            status='skipped',
            detail_en='Vehicle detection disabled',
            detail_km='ការរកឃើញរថយន្តត្រូវបានបិទ',
        ))

    if not ocr_enabled:
        steps.append(_step('plate_detect', status='skipped', detail_en='OCR disabled', detail_km='OCR ត្រូវបានបិទ'))
        steps.append(_step('plate_ocr', status='skipped', detail_en='OCR disabled', detail_km='OCR ត្រូវបានបិទ'))
    elif regions:
        steps.append(_step(
            'plate_detect',
            status='complete',
            detail_en=f'{len(regions)} plate region(s) scanned',
            detail_km=f'បានស្កេន {len(regions)} តំបន់ផ្លាកលេខ',
        ))
        if plate_text:
            steps.append(_step(
                'plate_ocr',
                status='complete',
                detail_en=plate_text,
                detail_km=plate_text,
                confidence=plate_conf,
            ))
        else:
            steps.append(_step(
                'plate_ocr',
                status='failed',
                detail_en='Could not read plate text',
                detail_km='មិនអាចអានផ្លាកលេខបាន',
            ))
    else:
        steps.append(_step(
            'plate_detect',
            status='failed',
            detail_en='No plate region found',
            detail_km='រកមិនឃើញតំបន់ផ្លាកលេខ',
        ))
        steps.append(_step(
            'plate_ocr',
            status='skipped',
            detail_en='Skipped — no plate region',
            detail_km='រំលង — គ្មានតំបន់ផ្លាក',
        ))

    if vehicle_summary:
        steps.append(_step(
            'show_vehicle',
            status='complete',
            detail_en=vehicle_summary['vehicle_label_en'],
            detail_km=vehicle_summary['vehicle_label_km'],
            confidence=vehicle_summary.get('vehicle_confidence') or None,
        ))
    else:
        steps.append(_step(
            'show_vehicle',
            status='empty',
            detail_en='Vehicle type not identified',
            detail_km='មិនស្គាល់ប្រភេទរថយន្ត',
        ))

    if plate_text:
        steps.append(_step(
            'show_plate',
            status='complete',
            detail_en=plate_text,
            detail_km=plate_text,
            confidence=plate_conf,
        ))
    else:
        steps.append(_step(
            'show_plate',
            status='empty',
            detail_en='No plate number',
            detail_km='គ្មានលេខផ្លាក',
        ))

    if violation_evaluation and violation_evaluation.get('is_violation'):
        steps.append(_step(
            'violation_check',
            status='complete',
            detail_en=violation_evaluation.get('title', 'Violation detected'),
            detail_km=violation_evaluation.get('title', 'រកឃើញការប្រព្រឹត្តិល្មើស'),
        ))
    elif violation_evaluation:
        steps.append(_step(
            'violation_check',
            status='empty',
            detail_en='No violation for this action',
            detail_km='គ្មានការប្រព្រឹត្តិល្មើសសម្រាប់សកម្មភាពនេះ',
        ))
    else:
        steps.append(_step(
            'violation_check',
            status='skipped',
            detail_en='Violation check skipped',
            detail_km='រំលងការពិនិត្យល្មើស',
        ))

    if evidence_saved and violation_id:
        detail = f'Frame + plate crop saved — violation #{violation_id}'
        if plate_text:
            detail = f'Frame + plate {plate_text} saved — violation #{violation_id}'
        steps.append(_step(
            'evidence_capture',
            status='complete',
            detail_en=detail,
            detail_km=f'បានរក្សាទុករូបភាព + ផ្លាក — ល្មើស #{violation_id}',
        ))
    elif log_id:
        detail = f'Detection frame saved (log #{log_id})'
        if plate_text:
            detail = f'Frame + plate crop {plate_text} saved (log #{log_id})'
        steps.append(_step(
            'evidence_capture',
            status='complete',
            detail_en=detail,
            detail_km=f'បានរក្សាទុករូបភាព + ផ្លាក (កំណត់ត្រា #{log_id})',
        ))
    else:
        steps.append(_step(
            'evidence_capture',
            status='pending',
            detail_en='Waiting for evidence',
            detail_km='រង់ចាំភស្តុតាង',
        ))

    if log_id:
        steps.append(_step(
            'save_record',
            status='complete',
            detail_en=f'Saved as log #{log_id}',
            detail_km=f'បានរក្សាទុក #{log_id}',
        ))
    else:
        steps.append(_step('save_record', status='pending', detail_en='Waiting to save', detail_km='រង់ចាំរក្សាទុក'))

    return steps


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


def run_detection_pipeline(detect_path: str, *, original_filename: str = '') -> dict:
    """
    Execute pipeline in order: vehicle → plate region → OCR → sign (parallel metadata).
    Returns sign_result, vehicles, plate_result, payload (without log_id / pipeline steps).
    """
    started = time.perf_counter()
    live_capture = _is_live_capture_filename(original_filename or detect_path)

    vehicles: list[dict] = []
    plate_result = _empty_plate_result()
    if not live_capture:
        if vehicle_detection_enabled():
            vehicles = detect_vehicles(detect_path)
        plate_result = recognize_plate(detect_path, vehicles)

    sign_result = detect_traffic_sign(detect_path, original_filename=original_filename)
    sign_result['processing_time'] = round(time.perf_counter() - started, 3)

    payload = compose_detection_payload(sign_result, vehicles, plate_result)
    vehicle_summary = _vehicle_summary(vehicles, plate_result)
    if vehicle_summary:
        payload['pipeline_vehicle'] = vehicle_summary

    return {
        'sign_result': sign_result,
        'vehicles': vehicles,
        'plate_result': plate_result,
        'vehicle_summary': vehicle_summary,
        'payload': payload,
    }
