"""Dashboard analytics aggregation."""
from calendar import month_abbr
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from ai_detection.models import AIDetectionLog
from ai_detection.page_stats import _trained_signs_queryset
from ai_detection.serializers import AIDetectionLogSerializer
from fines.models import Fine
from fines.serializers import FineSerializer
from vehicles.models import Vehicle
from violations.models import TrafficViolation

User = get_user_model()


def _serializer_context(request):
    return {'request': request} if request else {}


def _monthly_counts(qs, date_field='created_at', months=6):
    """Return a continuous month series (zeros included) for chart X-axis."""
    now = timezone.now()
    since = now - timedelta(days=months * 31)
    data = (
        qs.filter(**{f'{date_field}__gte': since})
        .annotate(month=TruncMonth(date_field))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )
    by_key = {}
    for row in data:
        if not row['month']:
            continue
        key = (row['month'].year, row['month'].month)
        by_key[key] = row['count']

    series = []
    y, m = now.year, now.month
    for _ in range(months):
        series.append({'month': month_abbr[m], 'count': by_key.get((y, m), 0)})
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    series.reverse()
    return series


def _monthly_fine_stats(fines, months=6):
    """Fine volume and paid revenue per month for charts (full month series)."""
    now = timezone.now()
    since = now - timedelta(days=months * 31)
    scoped = fines.filter(created_at__gte=since)
    counts = (
        scoped.annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )
    revenues = (
        scoped.filter(status='paid')
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(revenue=Sum('amount'))
        .order_by('month')
    )
    count_by = {}
    for row in counts:
        if row['month']:
            count_by[(row['month'].year, row['month'].month)] = row['count']
    rev_by = {}
    for row in revenues:
        if row['month']:
            rev_by[(row['month'].year, row['month'].month)] = float(row['revenue'] or 0)

    series = []
    y, m = now.year, now.month
    for _ in range(months):
        key = (y, m)
        series.append({
            'month': month_abbr[m],
            'count': count_by.get(key, 0),
            'revenue': rev_by.get(key, 0),
        })
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    series.reverse()
    return series


def _trend_percent(current: int, previous: int) -> dict | None:
    """Month-over-month change for KPI badges; None if not enough data."""
    if previous <= 0:
        if current > 0:
            return {'value': 100, 'up': True}
        return None
    change = round(((current - previous) / previous) * 100)
    if change == 0:
        return None
    return {'value': abs(change), 'up': change > 0}


def _fine_trend(fines_qs) -> dict | None:
    monthly = _monthly_counts(fines_qs, months=2)
    if len(monthly) < 2:
        return None
    return _trend_percent(monthly[-1]['count'], monthly[-2]['count'])


def get_admin_stats(request=None):
    fines = Fine.objects.all()
    paid = fines.filter(status='paid')
    detections = AIDetectionLog.objects.all()
    violations = TrafficViolation.objects.all()
    monthly_fines = _monthly_fine_stats(fines, months=7)

    # Match User Management: soft-deleted accounts stay in DB for FKs/audit but are not counted.
    users = User.objects.not_deleted()

    stats = {
        'total_users': users.count(),
        'total_drivers': users.filter(role='driver').count(),
        'total_police': users.filter(role='police').count(),
        'total_fines': fines.count(),
        'paid_fines': paid.count(),
        'pending_fines': fines.filter(status='pending').count(),
        'total_detections': detections.count(),
        'total_vehicles': Vehicle.objects.count(),
        # Match Traffic Signs module: only signs in the trained AI catalog.
        'total_signs': _trained_signs_queryset().count(),
        'total_violations': violations.count(),
        'pending_violations': violations.filter(status='pending_review').count(),
        'confirmed_violations': violations.filter(status='confirmed').count(),
        'fine_revenue': float(paid.aggregate(total=Sum('amount'))['total'] or 0),
        'detection_accuracy': round(
            float(detections.aggregate(avg=Avg('confidence'))['avg'] or 0),
            1,
        ),
        'monthly_fines': monthly_fines,
        'monthly_detections': _monthly_counts(detections, months=7),
        'monthly_violations': _monthly_counts(violations, date_field='violation_date', months=7),
        'fine_by_reason': [
            {'reason': (row['reason'] or 'Other')[:48], 'count': row['count']}
            for row in fines.values('reason').annotate(count=Count('id')).order_by('-count')[:8]
        ],
        'violation_by_type': [
            {
                'violation_type': (row['violation_type'] or 'Unknown').strip().upper().replace(' ', '_'),
                'count': row['count'],
            }
            for row in violations.exclude(violation_type__in=['', None])
            .values('violation_type')
            .annotate(count=Count('id'))
            .order_by('-count')[:8]
            if (row['violation_type'] or '').strip()
        ],
        'user_distribution': [
            {'role': 'Drivers', 'count': users.filter(role='driver').count()},
            {'role': 'Police', 'count': users.filter(role='police').count()},
            {'role': 'Admins', 'count': users.filter(role='admin').count()},
        ],
        'trends': {
            'users': None,
            'fines': _fine_trend(fines),
            'detections': _fine_trend(detections),
            'violations': _fine_trend(violations),
            'revenue': _fine_trend(paid),
        },
    }

    try:
        from .analytics_extensions import get_recent_activity, get_top_locations
        stats['top_locations'] = get_top_locations()
        stats['recent_activity'] = get_recent_activity(12, request=request)
    except Exception:
        stats['top_locations'] = []
        stats['recent_activity'] = []

    try:
        stats['vehicle_type_distribution'] = [
            {
                'name': (row['vehicle_type'] or 'unknown').replace('-', ' ').title(),
                'value': row['count'],
            }
            for row in Vehicle.objects.values('vehicle_type')
            .annotate(count=Count('id'))
            .order_by('-count')
            if row['count']
        ]
    except Exception:
        stats['vehicle_type_distribution'] = []

    return stats


def get_police_report_stats(police_user, request=None):
    """DashboardStats-shaped analytics — same system-wide scope as admin reports."""
    # Officers need the same operational picture as admins for Reports / Analytics.
    return get_admin_stats(request)


def get_police_stats(police_user, request=None):
    # Same fine inventory as admin — officers share operational system data.
    fines = Fine.objects.select_related('driver', 'police').all()
    today = timezone.now().date()
    recent_qs = fines.order_by('-created_at')[:5]
    ctx = _serializer_context(request)

    return {
        'total_issued': fines.count(),
        'today_issued': fines.filter(created_at__date=today).count(),
        'pending': fines.filter(status='pending').count(),
        'revenue': float(
            fines.filter(status='paid').aggregate(total=Sum('amount'))['total'] or 0
        ),
        'recent': FineSerializer(recent_qs, many=True, context=ctx).data,
    }


def get_driver_stats(user, request=None):
    fines = Fine.objects.filter(driver=user).select_related('driver', 'police')
    vehicles = Vehicle.objects.filter(owner=user)
    unpaid = fines.exclude(status__in=('paid', 'dismissed'))
    ctx = _serializer_context(request)

    return {
        'vehicles': vehicles.count(),
        'total_fines': fines.count(),
        'pending': unpaid.count(),
        'paid': fines.filter(status='paid').count(),
        'owed': float(unpaid.aggregate(total=Sum('amount'))['total'] or 0),
        'recent_fines': FineSerializer(
            fines.order_by('-created_at')[:3],
            many=True,
            context=ctx,
        ).data,
    }
