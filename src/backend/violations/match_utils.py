"""Plate↔vehicle match helpers for Detection Review Queue."""
from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)

_STALE_SEED = re.compile(r'^PP-\d{3,5}$', re.IGNORECASE)


def _compact(plate: str) -> str:
    return re.sub(r'[^A-Z0-9]', '', (plate or '').upper())


def plates_equivalent(a: str | None, b: str | None) -> bool:
    ca, cb = _compact(a or ''), _compact(b or '')
    return bool(ca and cb and ca == cb)


def is_stale_seed_plate(plate: str | None) -> bool:
    return bool(plate and _STALE_SEED.match(str(plate).strip()))


def match_status_for_violation(violation) -> dict:
    """
    Describe registry match for a pending (or any) violation.
    Returns match_status + linked/registry plate hints for the officer UI.
    """
    detected = (getattr(violation, 'plate_detected', None) or '').strip()
    linked_plate = ''
    if getattr(violation, 'vehicle_id', None) and getattr(violation, 'vehicle', None):
        linked_plate = (getattr(violation.vehicle, 'plate_number', None) or '').strip()

    if violation.vehicle_id and linked_plate:
        if detected and not plates_equivalent(detected, linked_plate):
            if is_stale_seed_plate(detected):
                status = 'repaired'
            else:
                status = 'plate_mismatch'
        else:
            status = 'matched'
        return {
            'match_status': status,
            'linked_vehicle_plate': linked_plate,
            'vehicle_linked': True,
        }

    if detected and not is_stale_seed_plate(detected):
        try:
            from ai_detection.plate_ocr import link_plate_to_vehicle

            hit = link_plate_to_vehicle(detected)
        except Exception:
            logger.exception('Registry lookup failed for %s', detected)
            hit = None
        if hit:
            return {
                'match_status': 'fuzzy' if hit.get('fuzzy_match') else 'registry_hit',
                'linked_vehicle_plate': hit.get('plate_number') or '',
                'vehicle_linked': False,
                'matched_vehicle_id': hit.get('id'),
                'matched_driver_id': hit.get('driver_id'),
            }

    if is_stale_seed_plate(detected):
        return {
            'match_status': 'stale_seed',
            'linked_vehicle_plate': '',
            'vehicle_linked': False,
        }

    return {
        'match_status': 'unmatched',
        'linked_vehicle_plate': '',
        'vehicle_linked': False,
    }


def _driver_vehicles(driver):
    from vehicles.models import Vehicle

    if driver is None:
        return []
    qs = Vehicle.objects.filter(driver=driver).order_by('id')
    rows = list(qs)
    if rows:
        return rows
    user = getattr(driver, 'user', None)
    if user is not None:
        return list(Vehicle.objects.filter(owner=user).order_by('id'))
    return []


def heal_violation_vehicle_link(violation) -> bool:
    """
    Attach a registered vehicle when the pending case is missing one.
    - Exact / fuzzy plate registry hit
    - Stale PP-* seed plates → driver's current vehicle (prefer single vehicle)
    Returns True if the violation was updated.
    """
    if getattr(violation, 'vehicle_id', None):
        return False

    from ai_detection.plate_ocr import link_plate_to_vehicle

    dirty = False
    detected = (getattr(violation, 'plate_detected', None) or '').strip()

    hit = None
    if detected and not is_stale_seed_plate(detected):
        try:
            hit = link_plate_to_vehicle(detected)
        except Exception:
            logger.exception('heal: plate link failed for %s', detected)

    if hit and hit.get('id'):
        from vehicles.models import Vehicle

        vehicle = Vehicle.objects.filter(pk=hit['id']).select_related('driver', 'owner').first()
        if vehicle:
            violation.vehicle = vehicle
            dirty = True
            # Prefer OCR plate; fill empty plate_detected from registry.
            if not detected:
                violation.plate_detected = (vehicle.plate_number or '')[:20]
            # If driver missing but vehicle has one, attach driver.
            if not violation.driver_id and getattr(vehicle, 'driver_id', None):
                violation.driver = vehicle.driver
            dirty = True

    if not violation.vehicle_id and is_stale_seed_plate(detected) and violation.driver_id:
        vehicles = _driver_vehicles(violation.driver)
        if len(vehicles) == 1:
            vehicle = vehicles[0]
            violation.vehicle = vehicle
            violation.plate_detected = (vehicle.plate_number or detected)[:20]
            dirty = True
        elif len(vehicles) > 1:
            # Prefer a non-PP plate if present.
            preferred = next(
                (v for v in vehicles if not is_stale_seed_plate(v.plate_number)),
                vehicles[0],
            )
            violation.vehicle = preferred
            violation.plate_detected = (preferred.plate_number or detected)[:20]
            dirty = True

    if dirty:
        update_fields = ['vehicle', 'plate_detected', 'updated_at']
        if violation.driver_id:
            update_fields.append('driver')
        violation.save(update_fields=update_fields)
    return dirty


def heal_pending_queue(limit: int = 100) -> int:
    """Heal vehicle links for pending_review rows. Returns number updated."""
    from violations.models import TrafficViolation

    qs = (
        TrafficViolation.objects.select_related('driver__user', 'vehicle')
        .filter(status='pending_review', vehicle__isnull=True)
        .order_by('-violation_date')[:limit]
    )
    fixed = 0
    for violation in qs:
        try:
            if heal_violation_vehicle_link(violation):
                fixed += 1
        except Exception:
            logger.exception('Failed healing violation %s', violation.id)
    return fixed
