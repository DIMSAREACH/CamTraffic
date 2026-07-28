"""Real-time stats and catalog data for the AI Detection page."""
import json
from pathlib import Path

from django.conf import settings
from django.db.models import Avg, Count, Sum

from core.media_urls import api_media_url
from traffic_signs.models import TrafficSign

from .models import AIDetectionLog

CATEGORY_UI = {
    'prohibitory': {'name': 'Prohibitory', 'color': '#EF4444'},
    'warning': {'name': 'Warning', 'color': '#F59E0B'},
    'mandatory': {'name': 'Mandatory', 'color': '#3B82F6'},
    'informative': {'name': 'Informative', 'color': '#10B981'},
}


def _logs_for_user(user):
    # Admin and officers share system-wide detection stats.
    from core.role_scope import is_ops_staff

    if is_ops_staff(user):
        return AIDetectionLog.objects.all()
    return AIDetectionLog.objects.filter(user=user)


def _ai_root() -> Path:
    return Path(getattr(settings, 'AI_ROOT', Path(settings.BASE_DIR).parent.parent / 'ai'))


def _read_training_status() -> dict:
    path = _ai_root() / 'weights' / 'training_status.json'
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return {}


def _trained_sign_codes() -> list[str]:
    from ai_detection.sign_catalog_loader import resolve_catalog_path

    # Core violation signs that MUST always be included
    core_violation_codes = [
        'R1-01', 'R1-02', 'R1-03', 'R1-04', 'R2-10', 'I-033', 'I-044',
        'PW03-R1-01', 'PW03-R1-02', 'PW03-R1-03', 'PW03-R1-04', 'PW03-R2-10',
    ]

    codes = _read_training_status().get('sign_codes') or []
    codes = [c for c in codes if c]
    if codes:
        # Include core violations + training status codes
        return list(set(core_violation_codes + codes))

    if resolve_catalog_path().name == 'traffic_sign_catalog_10.json':
        try:
            from ai_detection.sign_catalog_loader import load_sign_catalog_rows

            catalog_codes = [row.get('sign_code', '') for row in load_sign_catalog_rows() if row.get('sign_code')]
            # Include core violations + catalog codes
            return list(set(core_violation_codes + catalog_codes))
        except Exception:
            pass
    
    # Default: Include core violations + common prohibitory signs
    default_trained_codes = core_violation_codes + [
        'KH-NO-ENTRY', 'KH-NOUT', 'KH-NOPARK', 'I-019', 'I-020', 'I-021', 'I-031', 'I-032', 'I-037',
        'I-045', 'P-029', 'P-030', 'M-032',
    ]
    return default_trained_codes


def _trained_signs_queryset():
    codes = _trained_sign_codes()
    qs = TrafficSign.objects.all().order_by('category', 'sign_code')
    if codes:
        qs = qs.filter(sign_code__in=codes)
    return qs


def _count_training_images():
    dataset_root = _ai_root() / 'dataset' / 'images'
    if not dataset_root.exists():
        return int(getattr(settings, 'AI_TRAINING_SAMPLES', 0) or 0)
    total = 0
    for ext in ('*.jpg', '*.jpeg', '*.png', '*.webp', '*.bmp'):
        total += len(list(dataset_root.rglob(ext)))
    return total


def _short_label(sign_name_km: str, sign_name_en: str, sign_name: str) -> str:
    for text in (sign_name_en, sign_name_km, sign_name):
        if not text:
            continue
        words = text.split()
        if words:
            return words[0][:6].upper()
    return '?'


def _model_mode(weights_exist: bool) -> str:
    if not weights_exist:
        if settings.AI_USE_MOCK:
            return 'mock'
        return 'mock_fallback'

    mode = str(getattr(settings, 'AI_DETECTION_MODE', 'local')).strip().lower()
    if mode == 'local':
        return 'local'

    from ai_detection.gemini_service import gemini_available

    if mode == 'hybrid' and gemini_available():
        return 'hybrid'
    return 'local'


def get_ai_detection_page_stats(user, request=None):
    logs = _logs_for_user(user)
    # Exclude failed / empty detections so average confidence reflects real AI scores.
    scored_logs = logs.filter(confidence__gt=0)
    agg = scored_logs.aggregate(
        avg_conf=Avg('confidence'),
        avg_time=Avg('processing_time'),
    )
    total_scans = logs.count()
    avg_conf = round(float(agg['avg_conf'] or 0), 1)
    avg_time = round(float(agg['avg_time'] or 0), 2)

    signs = _trained_signs_queryset()
    sign_count = signs.count()
    trained_codes = _trained_sign_codes()

    categories = []
    names_by_cat: dict[str, list[str]] = {}
    for sign in signs.only('category', 'sign_name_en', 'sign_name').iterator(chunk_size=200):
        key = sign.category or 'warning'
        bucket = names_by_cat.setdefault(key, [])
        if len(bucket) >= 3:
            continue
        label = (sign.sign_name_en or sign.sign_name or '').strip()
        if label:
            bucket.append(label)

    for row in signs.values('category').annotate(count=Count('id')).order_by('category'):
        key = row['category'] or 'warning'
        meta = CATEGORY_UI.get(key, CATEGORY_UI['warning'])
        names = names_by_cat.get(key) or []
        desc = ', '.join(names) if names else 'Trained signs in this category'
        categories.append({
            'key': key,
            'name': meta['name'],
            'count': row['count'],
            'color': meta['color'],
            'desc': desc,
        })

    sample_signs = []
    for sign in signs.order_by('-image', 'sign_code')[:20]:
        meta = CATEGORY_UI.get(sign.category, CATEGORY_UI['warning'])
        image_url = api_media_url(request, sign.image) if sign.image else ''
        sample_signs.append({
            'id': sign.id,
            'sign_name': sign.sign_name,
            'sign_name_km': sign.sign_name_km or '',
            'sign_name_en': sign.sign_name_en or '',
            'sign_code': sign.sign_code or '',
            'category': sign.category,
            'image': image_url,
            'label': _short_label(
                sign.sign_name_km or '',
                sign.sign_name_en or '',
                sign.sign_name,
            ),
            'color': meta['color'],
        })

    weights_path = Path(settings.AI_MODEL_PATH)
    weights_exist = weights_path.is_file()
    mode = _model_mode(weights_exist)
    training_status = _read_training_status()
    training_images = int(training_status.get('training_images') or 0) or _count_training_images()
    catalog_total = TrafficSign.objects.count() or sign_count
    yolo_class_count = int(training_status.get('yolo_class_count') or 0)
    # Never load YOLO weights just to answer /api/ai/stats/ — use status file / fallback.
    if yolo_class_count < 1:
        yolo_class_count = len(trained_codes) or 19

    catalog_visual_refs = 0
    try:
        from .catalog_visual_match import catalog_visual_index_size

        catalog_visual_refs = catalog_visual_index_size()
    except Exception:
        catalog_visual_refs = 0

    vehicles_detected_total = 0
    if total_scans:
        vehicles_detected_total = int(
            logs.aggregate(total=Sum('vehicle_count'))['total'] or 0
        )

    return {
        'model': {
            'name': getattr(settings, 'AI_MODEL_NAME', 'YOLOv8-Cambodia'),
            'version': getattr(settings, 'AI_MODEL_VERSION', 'v2.1'),
            'mode': mode,
            'detection_mode': getattr(settings, 'AI_DETECTION_MODE', 'local'),
            'weights_loaded': weights_exist,
            'gemini_enabled': (
                str(getattr(settings, 'AI_DETECTION_MODE', 'local')).lower() == 'hybrid'
                and bool(getattr(settings, 'GEMINI_API_KEY', ''))
                and getattr(settings, 'GEMINI_ENABLED', False)
            ),
            'hybrid_threshold': float(getattr(settings, 'AI_HYBRID_CONFIDENCE_THRESHOLD', 70)),
            'sign_classes': catalog_total,
            'catalog_sign_count': catalog_total,
            'yolo_trained_classes': yolo_class_count,
            'catalog_visual_refs': catalog_visual_refs,
            'live_catalog_coverage': catalog_total,
            'training_images': training_images,
            'last_trained_at': training_status.get('trained_at'),
            'trained_sign_codes': trained_codes,
            'vehicle_detection_enabled': getattr(settings, 'AI_VEHICLE_ENABLED', True),
            'vehicle_model': getattr(settings, 'AI_VEHICLE_MODEL', 'yolov8n.pt'),
            'vehicle_classes': ['car', 'motorcycle', 'bus', 'truck'],
            'plate_ocr_enabled': getattr(settings, 'AI_PLATE_OCR_ENABLED', True),
            'plate_ocr_engine': 'EasyOCR',
        },
        'stats': {
            'total_scans': total_scans,
            'accuracy_avg': avg_conf,
            'avg_speed_sec': avg_time,
            'sign_count': sign_count,
            'vehicles_detected_total': vehicles_detected_total,
        },
        'categories': categories,
        'sample_signs': sample_signs,
    }
