"""Persist validated import rows (skip duplicates; per-row savepoints)."""
from __future__ import annotations

import secrets
from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from infrastructure.models import Camera, Road
from traffic_signs.models import TrafficSign
from users.models import Driver, Officer
from users.profile_services import provision_user_account
from vehicles.models import Vehicle
from violations.models import TrafficViolation

User = get_user_model()


def _temp_password() -> str:
    return f'Imp@{secrets.token_urlsafe(9)}!'


def import_user_row(data: dict, *, actor) -> None:
    password = (data.get('password') or '').strip() or _temp_password()
    license_no = (data.get('license_no') or '').strip() or None
    badge_no = (data.get('badge_no') or '').strip() or None
    user = User.objects.create_user(
        email=data['email'],
        password=password,
        full_name=data['name'],
        role=data['role'],
        phone=data.get('phone') or '',
        license_no=license_no if data['role'] == 'driver' else None,
        is_staff=data['role'] == 'admin',
        is_active=True,
    )
    provision_user_account(user, badge_no=badge_no, license_no=license_no)


def import_vehicle_row(data: dict, *, actor) -> None:
    owner = User.objects.get(pk=data['owner_id'])
    driver = Driver.objects.filter(user=owner).first()
    Vehicle.objects.create(
        owner=owner,
        driver=driver,
        plate_number=data['plate_number'],
        vehicle_type=data['vehicle_type'],
        model=data.get('model') or 'Unknown',
        color=data.get('color') or 'Unknown',
        year=int(data.get('year') or 2020),
        status='active',
    )


def import_sign_row(data: dict, *, actor) -> None:
    TrafficSign.objects.create(
        sign_code=data['code'],
        sign_name=data['name'],
        sign_name_en=data['name'],
        description=data.get('description') or data['name'],
        description_en=data.get('description') or data['name'],
        category=data['category'],
    )


def import_camera_row(data: dict, *, actor) -> None:
    road, _ = Road.objects.get_or_create(
        name=data['road_name'],
        defaults={
            'road_type': 'urban',
            'status': 'active',
            'city': '',
            'region': '',
        },
    )
    # URLField accepts http(s); RTSP and other schemes are stored as plain stream URLs.
    Camera.objects.create(
        road=road,
        name=data['location'],
        code=data['camera_id'],
        frame_source_url=(data.get('rtsp_url') or '').strip(),
        status=data.get('status') or 'active',
        camera_type='fixed',
    )


def import_violation_row(data: dict, *, actor) -> None:
    from fines.models import Fine

    when = parse_datetime(data['violation_date'])
    if when and timezone.is_naive(when):
        when = timezone.make_aware(when)

    driver = Driver.objects.get(pk=data['driver_id'])
    vehicle = Vehicle.objects.filter(pk=data['vehicle_id']).first()
    officer = Officer.objects.filter(user=actor).first()

    vtype = (data.get('violation_type') or '').strip()
    observed = (data.get('observed_action') or '').strip()
    # Keep only known choice codes in violation_type; free text goes to observed_action.
    valid_codes = {c[0] for c in TrafficViolation.VIOLATION_TYPE_CHOICES}
    if vtype and vtype not in valid_codes:
        observed = observed or vtype
        vtype = ''

    violation = TrafficViolation.objects.create(
        driver=driver,
        vehicle=vehicle,
        officer=officer,
        violation_type=vtype,
        observed_action=observed[:50] if observed else '',
        violation_date=when or timezone.now(),
        location='Imported record',
        description=f"Imported: {observed or vtype or 'violation'}",
        plate_detected=data['plate_number'],
        status='confirmed',
    )

    fine_raw = (data.get('fine_amount') or '').strip()
    if fine_raw:
        amount = Decimal(fine_raw)
        Fine.objects.create(
            violation=violation,
            driver=driver.user,
            police=actor if getattr(actor, 'role', None) in ('admin', 'police') else None,
            amount=amount,
            reason=observed or vtype or 'Imported fine',
            status='pending',
            location='Imported record',
            vehicle_plate=data['plate_number'],
            due_date=(timezone.now() + timedelta(days=30)).date(),
        )


IMPORTERS = {
    'users': import_user_row,
    'vehicles': import_vehicle_row,
    'signs': import_sign_row,
    'cameras': import_camera_row,
    'violations': import_violation_row,
}


def commit_job_rows(import_type: str, rows_report: list[dict], *, actor) -> list[dict[str, Any]]:
    """Import rows with status==ok. Returns updated report with commit outcomes."""
    importer = IMPORTERS[import_type]
    updated: list[dict[str, Any]] = []

    with transaction.atomic():
        for item in rows_report:
            status = item.get('status')
            if status != 'ok':
                updated.append(item)
                continue
            try:
                with transaction.atomic():
                    importer(item.get('data') or {}, actor=actor)
                updated.append({**item, 'status': 'success', 'errors': []})
            except Exception as exc:  # noqa: BLE001 — capture per-row failure
                updated.append({
                    **item,
                    'status': 'failed',
                    'errors': [str(exc) or 'Import failed for this row.'],
                })
    return updated
