"""Real-time stats and catalog data for the AI Detection page."""
import json
from pathlib import Path

from django.conf import settings
from django.db.models import Avg, Count

from traffic_signs.models import TrafficSign

from .models import AIDetectionLog

CATEGORY_UI = {
    'prohibitory': {'name': 'Prohibitory', 'color': '#EF4444'},
    'warning': {'name': 'Warning', 'color': '#F59E0B'},
    'mandatory': {'name': 'Mandatory', 'color': '#3B82F6'},
    'informative': {'name': 'Informative', 'color': '#10B981'},
}


def _logs_for_user(user):
    if getattr(user, 'role', None) == 'admin':
        return AIDetectionLog.objects.all()
    return AIDetectionLog.objects.filter(user=user)


def _read_training_status() -> dict:
    path = Path(settings.BASE_DIR).parent / 'ai' / 'weights' / 'training_status.json'
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        return {}


def _trained_sign_codes() -> list[str]:
    codes = _read_training_status().get('sign_codes') or []
    return [c for c in codes if c]


def _trained_signs_queryset():
    codes = _trained_sign_codes()
    qs = TrafficSign.objects.all().order_by('category', 'sign_code')
    if codes:
        qs = qs.filter(sign_code__in=codes)
    return qs


def _count_training_images():
    dataset_root = Path(settings.BASE_DIR).parent / 'ai' / 'dataset' / 'images'
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
    from ai_detection.gemini_service import gemini_available

    if weights_exist and gemini_available():
        return 'hybrid'
    if weights_exist:
        return 'yolo'
    if settings.AI_USE_MOCK:
        return 'mock'
    return 'mock_fallback'


def get_ai_detection_page_stats(user, request=None):
    logs = _logs_for_user(user)
    agg = logs.aggregate(
        total=Count('id'),
        avg_conf=Avg('confidence'),
        avg_time=Avg('processing_time'),
    )
    total_scans = agg['total'] or 0
    avg_conf = round(float(agg['avg_conf'] or 0), 1)
    avg_time = round(float(agg['avg_time'] or 0), 2)

    signs = _trained_signs_queryset()
    sign_count = signs.count()
    trained_codes = _trained_sign_codes()

    categories = []
    for row in signs.values('category').annotate(count=Count('id')).order_by('category'):
        key = row['category'] or 'warning'
        meta = CATEGORY_UI.get(key, CATEGORY_UI['warning'])
        names = list(
            signs.filter(category=key).values_list('sign_name_en', flat=True)[:3],
        )
        names = [n for n in names if n] or list(
            signs.filter(category=key).values_list('sign_name', flat=True)[:3],
        )
        desc = ', '.join(names) if names else 'Trained signs in this category'
        categories.append({
            'key': key,
            'name': meta['name'],
            'count': row['count'],
            'color': meta['color'],
            'desc': desc,
        })

    sample_signs = []
    for sign in signs.order_by('-image', 'sign_code'):
        meta = CATEGORY_UI.get(sign.category, CATEGORY_UI['warning'])
        image_url = ''
        if sign.image:
            image_url = request.build_absolute_uri(sign.image.url) if request else sign.image.url
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
    class_count = len(trained_codes) if trained_codes else sign_count

    return {
        'model': {
            'name': getattr(settings, 'AI_MODEL_NAME', 'YOLOv8-Cambodia'),
            'version': getattr(settings, 'AI_MODEL_VERSION', 'v2.1'),
            'mode': mode,
            'weights_loaded': weights_exist,
            'gemini_enabled': bool(getattr(settings, 'GEMINI_API_KEY', '')) and getattr(settings, 'GEMINI_ENABLED', True),
            'hybrid_threshold': float(getattr(settings, 'AI_HYBRID_CONFIDENCE_THRESHOLD', 70)),
            'sign_classes': class_count,
            'training_images': training_images,
            'last_trained_at': training_status.get('trained_at'),
            'trained_sign_codes': trained_codes,
            'vehicle_detection_enabled': getattr(settings, 'AI_VEHICLE_ENABLED', True),
            'vehicle_model': getattr(settings, 'AI_VEHICLE_MODEL', 'yolov8n.pt'),
            'vehicle_classes': ['car', 'motorcycle', 'bus', 'truck'],
        },
        'stats': {
            'total_scans': total_scans,
            'accuracy_avg': avg_conf,
            'avg_speed_sec': avg_time,
            'sign_count': sign_count,
            'vehicles_detected_total': sum(
                int(row.get('vehicle_count') or 0)
                for row in logs.values('vehicle_count')[:500]
            ) if total_scans else 0,
        },
        'categories': categories,
        'sample_signs': sample_signs,
    }
