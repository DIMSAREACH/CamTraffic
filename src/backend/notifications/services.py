"""Notification dispatch — Celery async with synchronous fallback."""
from __future__ import annotations

import logging

from django.conf import settings
from django.contrib.auth import get_user_model

from notifications.models import Notification

logger = logging.getLogger(__name__)
User = get_user_model()


def _resolve_user(user_or_id):
    if isinstance(user_or_id, User):
        return user_or_id
    return User.objects.filter(pk=user_or_id).first()


def dispatch_notification(
    user,
    title: str,
    message: str,
    notification_type: str = 'system',
    *,
    async_dispatch: bool = True,
) -> bool:
    """Queue in-app notification via Celery, or write synchronously if broker unavailable."""
    resolved = _resolve_user(user)
    if not resolved:
        logger.warning('Notification skipped — user not found: %s', user)
        return False

    if async_dispatch and getattr(settings, 'USE_REDIS', False):
        try:
            from core.tasks import send_notification_task

            send_notification_task.delay(str(resolved.pk), title, message, notification_type)
            return True
        except Exception as exc:
            logger.warning('Celery unavailable, sync notification fallback: %s', exc)

    Notification.objects.create(
        user=resolved,
        title=title,
        message=message,
        type=notification_type,
    )
    return True


def notify_driver_violation(driver, violation) -> bool:
    """Notify driver when a violation record is created from AI enforcement."""
    user = getattr(driver, 'user', None)
    if not user:
        return False
    vtype = getattr(violation, 'violation_type', 'Violation') or 'Violation'
    location = getattr(violation, 'location', '') or 'Unknown location'
    return dispatch_notification(
        user,
        title='Traffic Violation Recorded',
        message=f'{vtype} detected at {location}. Status: pending officer review.',
        notification_type='violation',
    )


def notify_driver_fine(user, fine) -> bool:
    """Notify driver when a fine is issued."""
    return dispatch_notification(
        user,
        title='New Fine Issued',
        message=f'A fine of ${fine.amount} USD has been issued for: {fine.reason}.',
        notification_type='fine',
    )


def notify_officer_detection(user, title: str, message: str, *, is_violation: bool = False) -> bool:
    return dispatch_notification(
        user,
        title=title,
        message=message,
        notification_type='violation' if is_violation else 'detection',
    )
