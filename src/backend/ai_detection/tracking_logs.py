"""Persist ByteTrack observations linked to detection logs."""

from __future__ import annotations

from .models import VehicleTrackingLog


def save_vehicle_tracking_logs(
    *,
    user,
    vehicles: list[dict],
    track_session: str,
    detection_log=None,
) -> int:
    track_session = (track_session or '').strip()
    if not track_session or not vehicles:
        return 0

    rows = []
    for vehicle in vehicles:
        track_id = vehicle.get('track_id')
        if track_id is None:
            continue
        rows.append(VehicleTrackingLog(
            user=user,
            detection_log=detection_log,
            track_session_id=track_session,
            track_id=int(track_id),
            vehicle_type=vehicle.get('vehicle_type') or 'car',
            confidence=float(vehicle.get('confidence') or 0),
            bbox=vehicle.get('bbox') or {},
        ))

    if not rows:
        return 0

    VehicleTrackingLog.objects.bulk_create(rows)
    return len(rows)
