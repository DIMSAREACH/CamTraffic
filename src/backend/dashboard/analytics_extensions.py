"""Extended analytics: heatmap, officer performance, driver stats, AI dashboard."""

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from ai_detection.models import AIDetectionLog
from ai_models.models import AIModelVersion
from fines.models import Fine
from infrastructure.models import Camera, Road
from users.models import Officer
from violations.models import TrafficViolation

User = get_user_model()


def get_heatmap_points():
    """Geo buckets from cameras and violation density."""
    points = []
    cameras = Camera.objects.select_related('road').filter(
        latitude__isnull=False,
        longitude__isnull=False,
    )
    for cam in cameras:
        violations = TrafficViolation.objects.filter(camera=cam).count()
        detections = cam.detection_count_today or 0
        intensity = violations * 3 + detections
        points.append({
            'id': str(cam.id),
            'name': cam.name,
            'road': cam.road.name if cam.road_id else '',
            'lat': float(cam.latitude),
            'lng': float(cam.longitude),
            'detections': detections,
            'violations': violations,
            'intensity': max(intensity, 1),
            'status': cam.status,
        })
    if not points:
        for road in Road.objects.filter(latitude__isnull=False, longitude__isnull=False)[:12]:
            points.append({
                'id': str(road.id),
                'name': road.name,
                'road': road.city or road.region or '',
                'lat': float(road.latitude),
                'lng': float(road.longitude),
                'detections': 0,
                'violations': 0,
                'intensity': 1,
                'status': road.status,
            })
    return sorted(points, key=lambda p: p['intensity'], reverse=True)


def get_top_locations():
    """Ranked Cambodia enforcement locations (cameras + violation hotspots)."""
    rows = []
    for cam in Camera.objects.select_related('road').all()[:15]:
        count = TrafficViolation.objects.filter(camera=cam).count()
        if count < 1:
            count = cam.detection_count_today or 0
        label = f'{cam.name} — {cam.road.name}' if cam.road_id else (cam.name or f'Camera {cam.pk}')
        rows.append({
            'name': label,
            'location': label,
            'fines': count,
            'detections': count,
            'lat': float(cam.latitude) if cam.latitude else None,
            'lng': float(cam.longitude) if cam.longitude else None,
        })

    # Fall back / enrich with real violation location strings (Phnom Penh streets, NR1, etc.)
    location_rows = (
        TrafficViolation.objects.exclude(location='')
        .values('location')
        .annotate(count=Count('id'))
        .order_by('-count')[:12]
    )
    for row in location_rows:
        label = (row['location'] or '').strip()
        if not label:
            continue
        if any(r['location'] == label or r['name'] == label for r in rows):
            continue
        rows.append({
            'name': label,
            'location': label,
            'fines': row['count'],
            'detections': row['count'],
            'lat': None,
            'lng': None,
        })

    rows.sort(key=lambda r: r['detections'], reverse=True)
    return rows[:8]


def get_recent_activity(limit: int = 12):
    """Unified recent enforcement feed for admin dashboard (Cambodia production view)."""
    items: list[dict] = []

    for v in (
        TrafficViolation.objects.select_related('driver__user', 'vehicle')
        .order_by('-created_at')[:limit]
    ):
        plate = ''
        if v.vehicle_id and getattr(v.vehicle, 'plate_number', None):
            plate = v.vehicle.plate_number
        elif v.plate_detected:
            plate = v.plate_detected
        raw_type = (v.violation_type or '').strip()
        if raw_type:
            title = raw_type.replace('_', ' ').title()
        else:
            title = (v.description or 'Traffic Violation').split(':')[-1].strip()[:60] or 'Traffic Violation'
        items.append({
            'id': f'violation-{v.id}',
            'kind': 'violation',
            'title': title,
            'subtitle': v.location or 'Cambodia road network',
            'meta': plate or (v.driver.user.full_name if v.driver_id and v.driver.user_id else 'Unknown driver'),
            'status': v.status,
            'href': '/admin/violations',
            'created_at': (v.created_at or timezone.now()).isoformat(),
        })

    for f in Fine.objects.select_related('driver', 'police').order_by('-created_at')[:limit]:
        items.append({
            'id': f'fine-{f.id}',
            'kind': 'fine',
            'title': (f.reason or 'Traffic fine')[:80],
            'subtitle': f.location or 'Phnom Penh',
            'meta': f.vehicle_plate or (f.driver.full_name if f.driver_id else ''),
            'status': f.status,
            'amount': float(f.amount),
            'href': '/admin/fines',
            'created_at': (f.created_at or timezone.now()).isoformat(),
        })

    for d in AIDetectionLog.objects.select_related('user').order_by('-created_at')[:limit]:
        items.append({
            'id': f'detection-{d.id}',
            'kind': 'detection',
            'title': d.detected_sign or 'AI Detection',
            'subtitle': f"Confidence {float(d.confidence or 0):.1f}%",
            'meta': d.detected_plate or (d.user.full_name if d.user_id else 'Officer'),
            'status': 'logged',
            'href': '/admin/ai-logs',
            'created_at': (d.created_at or timezone.now()).isoformat(),
        })

    items.sort(key=lambda row: row.get('created_at') or '', reverse=True)
    return items[:limit]


def get_officer_performance():
    rows = []
    for officer in Officer.objects.select_related('user').all()[:50]:
        user = officer.user
        fines = Fine.objects.filter(police=user)
        violations = TrafficViolation.objects.filter(officer=officer)
        paid = fines.filter(status='paid')
        rows.append({
            'id': str(user.id),
            'officer_id': str(officer.id),
            'full_name': user.full_name,
            'email': user.email,
            'badge_no': officer.badge_no or '',
            'fines_issued': fines.count(),
            'violations_reviewed': violations.count(),
            'revenue_collected': float(paid.aggregate(total=Sum('amount'))['total'] or 0),
            'pending_fines': fines.filter(status='pending').count(),
        })
    return sorted(rows, key=lambda r: r['fines_issued'], reverse=True)


def get_driver_analytics():
    rows = []
    for driver in User.objects.not_deleted().filter(role='driver').annotate(
        vehicle_count=Count('vehicles', distinct=True),
    ).order_by('-vehicle_count')[:50]:
        fines = Fine.objects.filter(driver=driver)
        unpaid = fines.exclude(status__in=('paid', 'dismissed'))
        rows.append({
            'id': str(driver.id),
            'full_name': driver.full_name,
            'email': driver.email,
            'vehicles': driver.vehicle_count or 0,
            'total_fines': fines.count(),
            'pending_fines': unpaid.count(),
            'amount_owed': float(unpaid.aggregate(total=Sum('amount'))['total'] or 0),
            'paid_fines': fines.filter(status='paid').count(),
        })
    return sorted(rows, key=lambda r: r['total_fines'], reverse=True)


def get_ai_dashboard_stats(user, request=None):
    from ai_detection.page_stats import get_ai_detection_page_stats
    from dashboard.services import get_admin_stats

    page = get_ai_detection_page_stats(user, request)
    admin = get_admin_stats(request)
    models = AIModelVersion.objects.all()
    datasets_count = 0
    try:
        from datasets.models import Dataset
        datasets_count = Dataset.objects.count()
    except Exception:
        pass

    latest = models.order_by('-uploaded_at').first()
    return {
        'models': {
            'total': models.count(),
            'active': models.filter(is_active=True).count(),
            'latest': latest.version if latest else None,
        },
        'datasets': {'registered': datasets_count},
        'detection': page.get('stats', {}),
        'model_runtime': page.get('model', {}),
        'enforcement': {
            'total_detections': admin.get('total_detections', 0),
            'detection_accuracy': admin.get('detection_accuracy', 0),
            'total_violations': admin.get('total_violations', 0),
        },
        'training': {
            'last_trained_at': page.get('model', {}).get('last_trained_at'),
            'training_images': page.get('model', {}).get('training_images', 0),
        },
        'generated_at': timezone.now().isoformat(),
    }


def get_detection_analytics(user):
    from core.role_scope import is_ops_staff

    logs = (
        AIDetectionLog.objects.all()
        if is_ops_staff(user)
        else AIDetectionLog.objects.filter(user=user)
    )
    agg = logs.aggregate(total=Count('id'), avg_conf=Avg('confidence'), avg_time=Avg('processing_time'))
    by_day = (
        logs.annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(count=Count('id'))
        .order_by('-day')[:14]
    )
    return {
        'total': agg['total'] or 0,
        'avg_confidence': round(float(agg['avg_conf'] or 0), 1),
        'avg_processing_sec': round(float(agg['avg_time'] or 0), 2),
        'daily': [{'day': str(row['day']), 'count': row['count']} for row in by_day if row['day']],
        'heatmap': get_heatmap_points()[:20],
    }
