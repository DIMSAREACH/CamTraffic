"""Dashboard analytics aggregation."""
from calendar import month_abbr
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from ai_detection.models import AIDetectionLog
from ai_detection.serializers import AIDetectionLogSerializer
from fines.models import Fine
from fines.serializers import FineSerializer
from traffic_signs.models import TrafficSign
from vehicles.models import Vehicle
from violations.models import TrafficViolation

User = get_user_model()


def _serializer_context(request):
    return {'request': request} if request else {}


def _monthly_counts(qs, date_field='created_at', months=6):
    since = timezone.now() - timedelta(days=months * 31)
    data = (
        qs.filter(**{f'{date_field}__gte': since})
        .annotate(month=TruncMonth(date_field))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )
    return [
        {
            'month': month_abbr[row['month'].month] if row['month'] else '',
            'count': row['count'],
        }
        for row in data
        if row['month']
    ]


def _monthly_fine_stats(fines, months=6):
    """Fine volume and paid revenue per month for charts."""
    since = timezone.now() - timedelta(days=months * 31)
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
    rev_by_month = {
        row['month']: float(row['revenue'] or 0)
        for row in revenues
        if row['month']
    }
    return [
        {
            'month': month_abbr[row['month'].month],
            'count': row['count'],
            'revenue': rev_by_month.get(row['month'], 0),
        }
        for row in counts
        if row['month']
    ]


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
    monthly_fines = _monthly_fine_stats(fines)

    return {
        'total_users': User.objects.count(),
        'total_drivers': User.objects.filter(role='driver').count(),
        'total_police': User.objects.filter(role='police').count(),
        'total_fines': fines.count(),
        'paid_fines': paid.count(),
        'pending_fines': fines.filter(status='pending').count(),
        'total_detections': detections.count(),
        'total_vehicles': Vehicle.objects.count(),
        'total_signs': TrafficSign.objects.count(),
        'total_violations': violations.count(),
        'pending_violations': violations.filter(status='pending_review').count(),
        'confirmed_violations': violations.filter(status='confirmed').count(),
        'fine_revenue': float(paid.aggregate(total=Sum('amount'))['total'] or 0),
        'detection_accuracy': round(
            float(detections.aggregate(avg=Avg('confidence'))['avg'] or 0),
            1,
        ),
        'monthly_fines': monthly_fines,
        'monthly_detections': _monthly_counts(detections),
        'monthly_violations': _monthly_counts(violations, date_field='violation_date'),
        'fine_by_reason': [
            {'reason': (row['reason'] or 'Other')[:40], 'count': row['count']}
            for row in fines.values('reason').annotate(count=Count('id')).order_by('-count')[:8]
        ],
        'violation_by_type': [
            {'violation_type': (row['violation_type'] or 'Unknown'), 'count': row['count']}
            for row in violations.values('violation_type').annotate(count=Count('id')).order_by('-count')[:8]
        ],
        'user_distribution': [
            {'role': 'Drivers', 'count': User.objects.filter(role='driver').count()},
            {'role': 'Police', 'count': User.objects.filter(role='police').count()},
            {'role': 'Admins', 'count': User.objects.filter(role='admin').count()},
        ],
        'trends': {
            'users': None,
            'fines': _fine_trend(fines),
            'detections': _fine_trend(detections),
            'violations': _fine_trend(violations),
            'revenue': _fine_trend(paid),
        },
    }


def get_police_report_stats(police_user, request=None):
    """DashboardStats-shaped analytics scoped to fines issued by this officer."""
    from users.models import Officer

    fines = Fine.objects.filter(police=police_user)
    paid = fines.filter(status='paid')
    detections = AIDetectionLog.objects.filter(user=police_user)
    monthly_fines = _monthly_fine_stats(fines)
    driver_ids = list(fines.values_list('driver_id', flat=True).distinct())
    officer = Officer.objects.filter(user=police_user).first()
    violations = (
        TrafficViolation.objects.filter(officer=officer)
        if officer
        else TrafficViolation.objects.none()
    )

    return {
        'total_users': len(driver_ids),
        'total_drivers': len(driver_ids),
        'total_police': 1,
        'total_fines': fines.count(),
        'paid_fines': paid.count(),
        'pending_fines': fines.filter(status='pending').count(),
        'total_detections': detections.count(),
        'total_vehicles': Vehicle.objects.filter(owner_id__in=driver_ids).count() if driver_ids else 0,
        'total_signs': TrafficSign.objects.count(),
        'total_violations': violations.count(),
        'pending_violations': violations.filter(status='pending_review').count(),
        'confirmed_violations': violations.filter(status='confirmed').count(),
        'fine_revenue': float(paid.aggregate(total=Sum('amount'))['total'] or 0),
        'detection_accuracy': round(
            float(detections.aggregate(avg=Avg('confidence'))['avg'] or 0),
            1,
        ),
        'monthly_fines': monthly_fines,
        'monthly_detections': _monthly_counts(detections),
        'monthly_violations': _monthly_counts(violations, date_field='violation_date'),
        'fine_by_reason': [
            {'reason': (row['reason'] or 'Other')[:40], 'count': row['count']}
            for row in fines.values('reason').annotate(count=Count('id')).order_by('-count')[:8]
        ],
        'violation_by_type': [
            {'violation_type': (row['violation_type'] or 'Unknown'), 'count': row['count']}
            for row in violations.values('violation_type').annotate(count=Count('id')).order_by('-count')[:8]
        ],
        'user_distribution': [
            {'role': 'Drivers fined', 'count': len(driver_ids)},
        ],
        'trends': {
            'fines': _fine_trend(fines),
            'detections': _fine_trend(detections),
            'violations': _fine_trend(violations),
            'revenue': _fine_trend(paid),
        },
    }


def get_police_stats(police_user, request=None):
    fines = Fine.objects.filter(police=police_user).select_related('driver', 'police')
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
    detections = AIDetectionLog.objects.filter(user=user).select_related('user')
    unpaid = fines.exclude(status__in=('paid', 'dismissed'))
    ctx = _serializer_context(request)

    return {
        'vehicles': vehicles.count(),
        'total_fines': fines.count(),
        'pending': unpaid.count(),
        'paid': fines.filter(status='paid').count(),
        'owed': float(unpaid.aggregate(total=Sum('amount'))['total'] or 0),
        'recent_detections': AIDetectionLogSerializer(
            detections.order_by('-created_at')[:3],
            many=True,
            context=ctx,
        ).data,
        'recent_fines': FineSerializer(
            fines.order_by('-created_at')[:3],
            many=True,
            context=ctx,
        ).data,
    }
