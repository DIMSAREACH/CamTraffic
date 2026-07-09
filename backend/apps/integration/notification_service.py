"""Task 140 — Notification dispatch when a detection produces a violation."""

from __future__ import annotations

import logging

from apps.detections.models import Detection
from apps.notifications.models import Notification

logger = logging.getLogger(__name__)

_DETECTION_TITLE = 'New Detection Alert'
_VIOLATION_TITLE = 'Traffic Violation Detected'


def notify_station_officers(detection: Detection) -> int:
    """
    Create in-app notifications for all active officers at the detection camera's station.
    Returns the number of notifications created.
    """
    camera = detection.camera
    station = getattr(camera, 'station', None)
    if station is None:
        return 0

    officers = (
        station.officers.filter(is_active=True)
        .select_related('user')
    )

    sign_label = ''
    if detection.traffic_sign:
        sign_label = f' ({detection.traffic_sign.code} — {detection.traffic_sign.name_en})'
    plate_label = f' | Plate: {detection.plate_number}' if detection.plate_number else ''

    body = (
        f'Camera {camera.code} detected{sign_label}{plate_label} '
        f'at confidence {detection.confidence:.0%}.'
    )

    created = 0
    for officer in officers:
        Notification.objects.create(
            user=officer.user,
            title=_DETECTION_TITLE,
            body=body,
            data={
                'detection_id': detection.id,
                'camera_id': camera.id,
                'camera_code': camera.code,
                'plate_number': detection.plate_number,
            },
        )
        created += 1

    logger.info('detection_id=%s: notified %d officer(s)', detection.id, created)
    return created


def notify_driver_violation(detection: Detection, driver_user) -> Notification:
    """Create a violation notification for the driver associated with the plate."""
    sign_name = detection.traffic_sign.name_en if detection.traffic_sign else 'traffic violation'
    body = (
        f'A {sign_name} violation was detected for your vehicle '
        f'(plate: {detection.plate_number}) at {detection.camera.location} '
        f'on {detection.detected_at:%Y-%m-%d %H:%M}.'
    )
    return Notification.objects.create(
        user=driver_user,
        title=_VIOLATION_TITLE,
        body=body,
        data={
            'detection_id': detection.id,
            'plate_number': detection.plate_number,
            'camera_code': detection.camera.code,
        },
    )
