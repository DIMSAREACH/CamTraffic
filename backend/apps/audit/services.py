from __future__ import annotations

from django.db.models import Count
from django.utils import timezone

from .models import AuditLog


def get_audit_log_summary() -> dict:
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    queryset = AuditLog.objects.all()

    return {
        'total_logs': queryset.count(),
        'logs_today': queryset.filter(created_at__gte=today_start).count(),
        'by_action': list(queryset.values('action').annotate(count=Count('id')).order_by('-count')),
        'by_module': list(queryset.values('module').annotate(count=Count('id')).order_by('-count')[:10]),
    }
