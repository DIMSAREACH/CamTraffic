"""Celery background tasks for CamTraffic."""
from __future__ import annotations

import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name='camtraffic.send_notification')
def send_notification_task(user_id: str, title: str, message: str, notification_type: str = 'system'):
    from django.contrib.auth import get_user_model

    from notifications.models import Notification

    User = get_user_model()
    user = User.objects.filter(pk=user_id).first()
    if not user:
        return {'ok': False, 'reason': 'user_not_found'}
    Notification.objects.create(user=user, title=title, message=message, type=notification_type)
    return {'ok': True, 'user_id': user_id}


@shared_task(name='camtraffic.mark_overdue_fines')
def mark_overdue_fines_task():
    from fines.models import Fine

    today = timezone.now().date()
    updated = Fine.objects.filter(
        status='pending',
        due_date__lt=today,
    ).update(status='overdue')
    logger.info('Marked %s fines as overdue', updated)
    return {'overdue_count': updated}


@shared_task(name='camtraffic.ping')
def ping_task():
    return {'ok': True, 'ts': timezone.now().isoformat()}
