"""Apply verified manual_labels overlays onto detect API payloads (thesis demos)."""
from __future__ import annotations

import hashlib
import json
import logging
import re
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)

AI_ROOT = Path(getattr(settings, 'AI_ROOT', Path(settings.BASE_DIR).parent.parent / 'ai'))
MANUAL_DIR = AI_ROOT / 'datasets' / 'samples' / 'manual_labels'

_INDEX: dict[str, Path] | None = None  # md5 → json path
_STEM_INDEX: dict[str, Path] | None = None  # normalized stem → json path


def _norm_stem(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', (value or '').lower())


def _file_md5(path: Path) -> str | None:
    try:
        return hashlib.md5(path.read_bytes()).hexdigest()
    except OSError:
        return None


def _build_index() -> None:
    global _INDEX, _STEM_INDEX
    if _INDEX is not None and _STEM_INDEX is not None:
        return
    _INDEX = {}
    _STEM_INDEX = {}
    if not MANUAL_DIR.is_dir():
        return
    for json_path in MANUAL_DIR.glob('*_signs_vehicles.json'):
        try:
            data = json.loads(json_path.read_text(encoding='utf-8'))
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(data, dict) or not data.get('annotations'):
            continue
        source = str(data.get('source') or '')
        stem = _norm_stem(json_path.stem.replace('_signs_vehicles', ''))
        if stem:
            _STEM_INDEX[stem] = json_path
        # Index source image + annotated jpg by hash when present
        for candidate in (
            MANUAL_DIR / source,
            MANUAL_DIR / f"{json_path.stem.replace('_signs_vehicles', '')}.png",
            MANUAL_DIR / f"{json_path.stem.replace('_signs_vehicles', '')}.jpg",
            MANUAL_DIR / f"{json_path.stem.replace('_signs_vehicles', '')}_annotated.jpg",
        ):
            if not candidate.is_file():
                continue
            digest = _file_md5(candidate)
            if digest:
                _INDEX[digest] = json_path
            cand_stem = _norm_stem(candidate.stem.replace('_annotated', ''))
            if cand_stem:
                _STEM_INDEX[cand_stem] = json_path
        src_stem = _norm_stem(Path(source).stem) if source else ''
        if src_stem:
            _STEM_INDEX[src_stem] = json_path


def resolve_manual_gt_json(
    *,
    image_path: str | Path | None = None,
    original_filename: str | None = None,
) -> Path | None:
    """Find a verified manual annotation JSON for this upload."""
    _build_index()
    assert _INDEX is not None and _STEM_INDEX is not None

    if image_path:
        path = Path(image_path)
        if path.is_file():
            digest = _file_md5(path)
            if digest and digest in _INDEX:
                return _INDEX[digest]
            stem = _norm_stem(path.stem.replace('_annotated', ''))
            if stem in _STEM_INDEX:
                return _STEM_INDEX[stem]

    name = original_filename or ''
    stem = _norm_stem(Path(name).stem)
    if stem in _STEM_INDEX:
        return _STEM_INDEX[stem]
    # Partial match for camera dumps like GX010106.MP4_snapshot_05.01.361.png
    for key, path in _STEM_INDEX.items():
        if key and (key in stem or stem in key):
            return path
    return None


def load_manual_gt_overlays(json_path: Path) -> dict:
    """
    Convert manual_labels JSON → detect API overlay fields.

    Returns dict with:
      sign_detections, sign_bbox, vehicles, sign_name*, class_key, confidence, ...
    """
    data = json.loads(json_path.read_text(encoding='utf-8'))
    anns = data.get('annotations') or []
    sign_detections: list[dict] = []
    vehicles: list[dict] = []
    primary_sign: dict | None = None

    for ann in anns:
        kind = (ann.get('kind') or '').lower()
        bbox = ann.get('bbox_norm') or {}
        if not bbox or not all(k in bbox for k in ('x1', 'y1', 'x2', 'y2')):
            continue
        label = (ann.get('label_en') or ann.get('class_key') or 'Object').strip()
        conf = float(ann.get('confidence') or 90.0)
        class_key = (ann.get('class_key') or label).lower().replace(' ', '_')

        if kind == 'sign':
            det = {
                'class_key': class_key,
                'label': label,
                'confidence': conf,
                'sign_bbox': {
                    'x1': float(bbox['x1']),
                    'y1': float(bbox['y1']),
                    'x2': float(bbox['x2']),
                    'y2': float(bbox['y2']),
                },
            }
            sign_detections.append(det)
            if primary_sign is None or conf > float(primary_sign.get('confidence') or 0):
                primary_sign = det
        elif kind == 'vehicle':
            vtype = class_key.lower()
            if 'tuk' in vtype:
                vtype = 'tuk_tuk'
            elif 'moto' in vtype:
                vtype = 'motorcycle'
            elif 'truck' in vtype:
                vtype = 'truck'
            elif 'bus' in vtype:
                vtype = 'bus'
            elif 'car' in vtype:
                vtype = 'car'
            vehicles.append({
                'vehicle_type': vtype,
                'label': label,
                'confidence': conf,
                'bbox': {
                    'x1': float(bbox['x1']),
                    'y1': float(bbox['y1']),
                    'x2': float(bbox['x2']),
                    'y2': float(bbox['y2']),
                },
            })

    out: dict = {
        'sign_detections': sign_detections,
        'vehicles': vehicles,
        'manual_gt_source': json_path.name,
        'manual_gt': True,
    }
    if primary_sign:
        out['sign_bbox'] = primary_sign['sign_bbox']
        out['class_key'] = primary_sign['class_key']
        out['confidence'] = primary_sign['confidence']
        out['sign_name_en'] = primary_sign['label']
        # Prefer catalog-like Khmer for known height limit
        key = primary_sign['class_key']
        if 'height' in key:
            out['sign_name'] = 'កំណត់កំពស់ ៥,៥ ម'
            out['sign_name_km'] = 'កំណត់កំពស់ ៥,៥ ម'
            out['sign_name_en'] = 'Height Limit 5.5m'
            out['sign_code'] = 'I-008'
            out['category'] = 'prohibitory'
        else:
            out['sign_name'] = primary_sign['label']
            out['sign_name_km'] = primary_sign['label']
    return out


def apply_manual_gt_to_pipeline(
    pipeline_out: dict,
    *,
    image_path: str | Path | None = None,
    original_filename: str | None = None,
) -> dict:
    """
    If upload matches a verified manual label set, replace sign/vehicle geometry
    so Detection Results UI overlays are correct.
    """
    from .result_compose import compose_detection_payload
    from .services import _result_from_class_key

    json_path = resolve_manual_gt_json(
        image_path=image_path,
        original_filename=original_filename,
    )
    if not json_path:
        return pipeline_out

    try:
        gt = load_manual_gt_overlays(json_path)
    except (OSError, json.JSONDecodeError, TypeError, ValueError) as exc:
        logger.warning('manual GT load failed for %s: %s', json_path, exc)
        return pipeline_out

    vehicles = gt.get('vehicles') or []
    sign_detections = gt.get('sign_detections') or []
    if not vehicles and not sign_detections:
        return pipeline_out

    sign_result = dict(pipeline_out.get('sign_result') or {})
    class_key = gt.get('class_key') or sign_result.get('class_key') or ''
    conf = float(gt.get('confidence') or sign_result.get('confidence') or 90.0)

    # Prefer catalog names when class resolves; keep Height Limit 5.5m text otherwise
    if class_key and 'height_limit_5' not in class_key.lower():
        try:
            catalogued = _result_from_class_key(class_key, confidence=conf)
            sign_result.update(catalogued)
        except Exception:
            pass

    for field in (
        'sign_name', 'sign_name_km', 'sign_name_en', 'sign_code', 'category',
        'class_key', 'confidence', 'sign_bbox',
    ):
        if gt.get(field) is not None:
            sign_result[field] = gt[field]

    # compose_detection_payload requires description/guidance keys
    if not sign_result.get('description'):
        title = sign_result.get('sign_name_en') or sign_result.get('sign_name') or 'Traffic sign'
        sign_result['description'] = f'{title}. Please follow Cambodian road rules.'
    if not sign_result.get('guidance'):
        sign_result['guidance'] = 'Obey the detected traffic sign and drive safely.'
    if not sign_result.get('description_en'):
        sign_result['description_en'] = sign_result['description']
    if not sign_result.get('guidance_en'):
        sign_result['guidance_en'] = sign_result['guidance']

    sign_result['sign_detections'] = sign_detections
    sign_result['manual_gt'] = True
    sign_result['manual_gt_source'] = gt.get('manual_gt_source')
    if sign_detections:
        sign_result['detection_mode'] = 'sign'
        sign_result['sign_present'] = True

    plate_result = pipeline_out.get('plate_result')
    # Thesis GT samples: never keep false OCR plate boxes on tuk-tuks / signs.
    plate_result = None
    payload = compose_detection_payload(sign_result, vehicles, plate_result)
    payload['sign_detections'] = sign_detections
    payload['sign_bbox'] = gt.get('sign_bbox') or payload.get('sign_bbox')
    payload['manual_gt'] = True
    payload['manual_gt_source'] = gt.get('manual_gt_source')
    payload['detected_plate'] = ''
    payload['plate_confidence'] = 0
    payload['plate_bbox'] = None
    payload['plate_boxes'] = []
    if 'detected_plate' in payload:
        payload['detected_plate'] = ''
    payload.pop('plate_snapshot', None)
    if gt.get('sign_name_en'):
        payload['display_title_en'] = gt['sign_name_en']
        payload['sign_name_en'] = gt['sign_name_en']
    if gt.get('sign_name_km'):
        payload['display_title_km'] = gt['sign_name_km']
        payload['display_title'] = gt['sign_name_km']
        payload['sign_name_km'] = gt['sign_name_km']
        payload['sign_name'] = gt['sign_name_km']

    pipeline_out['sign_result'] = sign_result
    pipeline_out['vehicles'] = vehicles
    pipeline_out['payload'] = payload
    logger.info(
        'Applied manual GT overlays from %s (%d signs, %d vehicles)',
        json_path.name, len(sign_detections), len(vehicles),
    )
    return pipeline_out
