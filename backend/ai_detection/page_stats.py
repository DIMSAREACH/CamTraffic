"""Real-time stats and catalog data for the AI Detection page."""
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

SIGN_CODE_TO_CLASS = {
    'KH-STOP': 'stop',
    'KH-NO-ENTRY': 'no_entry',
    'KH-SP40': 'speed_limit_40',
    'KH-SP60': 'speed_limit_60',
    'KH-YIELD': 'yield',
    'KH-NOPARK': 'no_parking',
    'KH-PED': 'pedestrian_crossing',
    'KH-ONEWAY': 'one_way',
    'KH-NOUT': 'no_u_turn',
    'KH-ROUND': 'roundabout',
    'R1-01': 'no_left_turn',
}


def _logs_for_user(user):
    if getattr(user, 'role', None) == 'admin':
        return AIDetectionLog.objects.all()
    return AIDetectionLog.objects.filter(user=user)


def _count_training_images():
    dataset_root = Path(settings.BASE_DIR).parent / 'ai' / 'dataset' / 'images'
    if not dataset_root.exists():
        return int(getattr(settings, 'AI_TRAINING_SAMPLES', 0) or 0)
    total = 0
    for ext in ('*.jpg', '*.jpeg', '*.png', '*.webp', '*.bmp'):
        total += len(list(dataset_root.rglob(ext)))
    return total


def _short_label(sign_name: str, sign_code: str) -> str:
    if sign_code and sign_code.startswith('KH-SP'):
        digits = ''.join(c for c in sign_code if c.isdigit())
        return digits or sign_code.split('-')[-1][:4]
    lower = sign_name.lower()
    if 'stop' in lower:
        return 'STOP'
    if 'no entry' in lower:
        return '⛔'
    if 'school' in lower:
        return '🏫'
    if 'pedestrian' in lower:
        return '🚶'
    if 'one way' in lower:
        return '→'
    words = sign_name.split()
    return (words[0][:4].upper() if words else '?')[:6]


def _model_mode(weights_exist: bool) -> str:
    if settings.AI_USE_MOCK:
        return 'mock'
    if weights_exist:
        return 'yolo'
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

    signs = TrafficSign.objects.all().order_by('category', 'sign_name')
    sign_count = signs.count()

    categories = []
    for row in signs.values('category').annotate(count=Count('id')).order_by('category'):
        key = row['category'] or 'warning'
        meta = CATEGORY_UI.get(key, CATEGORY_UI['warning'])
        names = list(
            signs.filter(category=key).values_list('sign_name', flat=True)[:3],
        )
        desc = ', '.join(names) if names else 'Traffic signs in this category'
        categories.append({
            'key': key,
            'name': meta['name'],
            'count': row['count'],
            'color': meta['color'],
            'desc': desc,
        })

    sample_signs = []
    for sign in signs:
        meta = CATEGORY_UI.get(sign.category, CATEGORY_UI['warning'])
        image_url = ''
        if sign.image:
            image_url = request.build_absolute_uri(sign.image.url) if request else sign.image.url
        sample_signs.append({
            'id': sign.id,
            'sign_name': sign.sign_name,
            'sign_code': sign.sign_code or '',
            'category': sign.category,
            'image': image_url,
            'label': _short_label(sign.sign_name, sign.sign_code or ''),
            'color': meta['color'],
        })
        if len(sample_signs) >= 8:
            break

    weights_path = Path(settings.AI_MODEL_PATH)
    weights_exist = weights_path.is_file()
    mode = _model_mode(weights_exist)
    training_images = _count_training_images()

    return {
        'model': {
            'name': getattr(settings, 'AI_MODEL_NAME', 'YOLOv8-Cambodia'),
            'version': getattr(settings, 'AI_MODEL_VERSION', 'v2.1'),
            'mode': mode,
            'weights_loaded': weights_exist and not settings.AI_USE_MOCK,
            'sign_classes': sign_count,
            'training_images': training_images,
        },
        'stats': {
            'total_scans': total_scans,
            'accuracy_avg': avg_conf,
            'avg_speed_sec': avg_time,
            'sign_count': sign_count,
        },
        'categories': categories,
        'sample_signs': sample_signs,
    }
