from datetime import timedelta

from django.utils import timezone

from .models import Camera

STALE_WARNING_MINUTES = 60
STALE_CRITICAL_MINUTES = 24 * 60


def compute_health_state(camera: Camera, minutes_since_check: float | None) -> str:
    if not camera.is_active:
        return 'unknown'

    if camera.status == Camera.Status.ERROR:
        return 'critical'

    if camera.status == Camera.Status.OFFLINE:
        return 'critical'

    if camera.last_health_check is None:
        return 'unknown'

    if minutes_since_check is not None and minutes_since_check > STALE_CRITICAL_MINUTES:
        return 'critical'

    if camera.status == Camera.Status.MAINTENANCE:
        return 'warning'

    if minutes_since_check is not None and minutes_since_check > STALE_WARNING_MINUTES:
        return 'warning'

    if camera.status == Camera.Status.ONLINE and not camera.stream_url:
        return 'warning'

    if camera.status == Camera.Status.ONLINE:
        return 'healthy'

    return 'warning'


def build_camera_health_record(camera: Camera) -> dict:
    minutes_since_check = None
    if camera.last_health_check:
        minutes_since_check = round((timezone.now() - camera.last_health_check).total_seconds() / 60, 1)

    return {
        'id': camera.id,
        'name': camera.name,
        'code': camera.code,
        'location': camera.location,
        'status': camera.status,
        'station_id': camera.station_id,
        'station_code': camera.station.code if camera.station_id else None,
        'station_name': camera.station.name if camera.station_id else None,
        'is_active': camera.is_active,
        'last_health_check': camera.last_health_check,
        'health_state': compute_health_state(camera, minutes_since_check),
        'minutes_since_check': minutes_since_check,
        'has_stream_url': bool(camera.stream_url),
    }


def perform_health_check(camera: Camera) -> Camera:
    if camera.status not in (Camera.Status.MAINTENANCE, Camera.Status.ERROR):
        camera.status = Camera.Status.ONLINE if camera.stream_url else Camera.Status.OFFLINE
    camera.last_health_check = timezone.now()
    camera.save(update_fields=['status', 'last_health_check', 'updated_at'])
    return camera
