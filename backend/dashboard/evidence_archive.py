"""Unified evidence search across detections, violations, and fines."""
from __future__ import annotations

from django.db.models import Q

from ai_detection.models import AIDetectionLog
from fines.models import Fine
from violations.models import TrafficViolation


def _media_url(request, field) -> str | None:
    if field and getattr(field, 'name', None):
        try:
            return request.build_absolute_uri(field.url)
        except (ValueError, AttributeError):
            return None
    return None


def _append_detection(records: list, log: AIDetectionLog, request) -> None:
    if not (log.uploaded_image or log.vehicle_snapshot or log.plate_snapshot):
        return
    records.append({
        'id': f'detection:{log.id}',
        'source_type': 'detection',
        'source_id': log.id,
        'title': log.detected_sign or 'AI Detection',
        'plate': log.detected_plate or '',
        'location': '',
        'image_url': _media_url(request, log.uploaded_image),
        'vehicle_image_url': _media_url(request, log.vehicle_snapshot),
        'plate_image_url': _media_url(request, log.plate_snapshot),
        'created_at': log.created_at.isoformat(),
    })


def _append_violation(records: list, row: TrafficViolation, request) -> None:
    plate = ''
    if row.vehicle_id and row.vehicle:
        plate = row.vehicle.plate_number or ''
    elif row.ai_detection_log_id and row.ai_detection_log:
        plate = row.ai_detection_log.detected_plate or ''
    image = row.evidence_image or (
        row.ai_detection_log.uploaded_image if row.ai_detection_log_id else None
    )
    vehicle_img = row.vehicle_evidence_image or (
        row.ai_detection_log.vehicle_snapshot if row.ai_detection_log_id else None
    )
    plate_img = row.plate_evidence_image or (
        row.ai_detection_log.plate_snapshot if row.ai_detection_log_id else None
    )
    if not (image or vehicle_img or plate_img):
        return
    records.append({
        'id': f'violation:{row.id}',
        'source_type': 'violation',
        'source_id': row.id,
        'title': row.violation_type or row.description or 'Traffic Violation',
        'plate': plate,
        'location': row.location or '',
        'image_url': _media_url(request, image),
        'vehicle_image_url': _media_url(request, vehicle_img),
        'plate_image_url': _media_url(request, plate_img),
        'created_at': row.violation_date.isoformat(),
    })


def _append_fine(records: list, fine: Fine, request) -> None:
    if not fine.evidence_image:
        return
    records.append({
        'id': f'fine:{fine.id}',
        'source_type': 'fine',
        'source_id': fine.id,
        'title': fine.reason or 'Fine Evidence',
        'plate': fine.vehicle_plate or '',
        'location': fine.location or '',
        'image_url': _media_url(request, fine.evidence_image),
        'vehicle_image_url': None,
        'plate_image_url': None,
        'created_at': fine.created_at.isoformat(),
    })


def search_evidence_archive(
    request,
    *,
    user,
    plate: str = '',
    source_type: str = 'all',
    limit: int = 60,
) -> list[dict]:
    plate_q = plate.strip()
    limit = max(1, min(int(limit or 60), 200))
    records: list[dict] = []

    det_qs = AIDetectionLog.objects.select_related('user').order_by('-created_at')
    viol_qs = TrafficViolation.objects.select_related(
        'vehicle', 'ai_detection_log', 'officer__user',
    ).order_by('-violation_date')
    fine_qs = Fine.objects.select_related('driver', 'police').order_by('-created_at')

    if user.role == 'police':
        det_qs = det_qs.filter(user=user)
        if hasattr(user, 'officer_profile'):
            viol_qs = viol_qs.filter(officer=user.officer_profile)
        else:
            from users.models import Officer
            officer = Officer.objects.filter(user=user).first()
            viol_qs = viol_qs.filter(officer=officer) if officer else viol_qs.none()
        fine_qs = fine_qs.filter(police=user)
    elif user.role == 'driver':
        det_qs = det_qs.filter(user=user)
        viol_qs = viol_qs.filter(driver__user=user)
        fine_qs = fine_qs.filter(driver=user)

    if plate_q:
        det_qs = det_qs.filter(detected_plate__icontains=plate_q)
        viol_qs = viol_qs.filter(
            Q(vehicle__plate_number__icontains=plate_q)
            | Q(ai_detection_log__detected_plate__icontains=plate_q)
        )
        fine_qs = fine_qs.filter(vehicle_plate__icontains=plate_q)

    if source_type in ('all', 'detection'):
        for log in det_qs[:limit]:
            _append_detection(records, log, request)

    if source_type in ('all', 'violation'):
        for row in viol_qs[:limit]:
            _append_violation(records, row, request)

    if source_type in ('all', 'fine'):
        for fine in fine_qs[:limit]:
            _append_fine(records, fine, request)

    records.sort(key=lambda r: r.get('created_at') or '', reverse=True)
    return records[:limit]
