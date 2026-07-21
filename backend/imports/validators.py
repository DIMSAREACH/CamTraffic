"""Row validation for each import type (duplicate = skip)."""
from __future__ import annotations

import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from django.contrib.auth import get_user_model
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from infrastructure.models import Camera
from traffic_signs.models import TrafficSign
from vehicles.models import Vehicle
from violations.models import TrafficViolation

User = get_user_model()

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

ROLE_MAP = {
    'user': 'driver',
    'driver': 'driver',
    'citizen': 'driver',
    'viewer': 'driver',
    'guest': 'driver',
    'police': 'police',
    'officer': 'police',
    'editor': 'police',
    'staff': 'police',
    'traffic police': 'police',
    'admin': 'admin',
    'administrator': 'admin',
    'manager': 'admin',
    'superadmin': 'admin',
    'super admin': 'admin',
}

VEHICLE_TYPE_MAP = {
    'car': 'car',
    'cars': 'car',
    'motorcycle': 'motorcycle',
    'moto': 'motorcycle',
    'motorbike': 'motorcycle',
    'truck': 'truck',
    'bus': 'bus',
    'tuk-tuk': 'tuk-tuk',
    'tuktuk': 'tuk-tuk',
    'tuk tuk': 'tuk-tuk',
}

CATEGORY_MAP = {
    'warning': 'warning',
    'prohibitory': 'prohibitory',
    'regulatory': 'prohibitory',
    'mandatory': 'mandatory',
    'informative': 'informative',
    'information': 'informative',
}

CAMERA_STATUS_MAP = {
    'active': 'active',
    'inactive': 'inactive',
    'offline': 'offline',
    'maintenance': 'maintenance',
}

VIOLATION_TYPE_ALIASES = {
    'illegal left turn': 'ILLEGAL_LEFT_TURN',
    'illegal_right_turn': 'ILLEGAL_RIGHT_TURN',
    'illegal right turn': 'ILLEGAL_RIGHT_TURN',
    'illegal u-turn': 'ILLEGAL_U_TURN',
    'illegal u turn': 'ILLEGAL_U_TURN',
    'no parking': 'NO_PARKING',
    'no stopping': 'NO_STOPPING',
    'road closed': 'ROAD_CLOSED',
    'weight limit': 'WEIGHT_LIMIT_VIOLATION',
    'no helmet': 'NO_PARKING',  # free-text fallback mapped for demo migration
}


def _ok(data: dict) -> dict:
    return {'status': 'ok', 'errors': [], 'data': data}


def _err(errors: list[str], data: dict | None = None) -> dict:
    return {'status': 'error', 'errors': errors, 'data': data or {}}


def _skip(reason: str, data: dict | None = None) -> dict:
    return {'status': 'skip', 'errors': [reason], 'data': data or {}}


def map_role(raw: str) -> str | None:
    return ROLE_MAP.get((raw or '').strip().lower())


def map_vehicle_type(raw: str) -> str | None:
    return VEHICLE_TYPE_MAP.get((raw or '').strip().lower())


def map_category(raw: str) -> str | None:
    return CATEGORY_MAP.get((raw or '').strip().lower())


def map_violation_type(raw: str) -> tuple[str, str]:
    """Return (violation_type_code_or_blank, observed_action)."""
    text = (raw or '').strip()
    upper = text.upper().replace(' ', '_')
    valid_codes = {c[0] for c in TrafficViolation.VIOLATION_TYPE_CHOICES}
    if upper in valid_codes:
        return upper, text
    alias = VIOLATION_TYPE_ALIASES.get(text.lower())
    if alias:
        return alias, text
    return '', text


def parse_when(raw: str):
    text = (raw or '').strip()
    if not text:
        return None
    dt = parse_datetime(text)
    if dt:
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt)
        return dt
    d = parse_date(text)
    if d:
        return timezone.make_aware(datetime.combine(d, datetime.min.time()))
    # try common formats
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d'):
        try:
            d = datetime.strptime(text, fmt).date()
            return timezone.make_aware(datetime.combine(d, datetime.min.time()))
        except ValueError:
            continue
    return None


def _derive_user_name(row: dict[str, str], email: str) -> str:
    """Prefer Name / Full Name; else First+Last; else email local-part."""
    name = (row.get('name') or '').strip()
    if name:
        return name
    first = (row.get('first_name') or '').strip()
    last = (row.get('last_name') or '').strip()
    combined = f'{first} {last}'.strip()
    if combined:
        return combined
    if email and '@' in email:
        local = email.split('@', 1)[0]
        pretty = re.sub(r'[._+\-]+', ' ', local).strip()
        return pretty.title() if pretty else local
    return ''


def validate_users_row(row: dict[str, str], *, actor, seen_emails: set[str]) -> dict:
    errors: list[str] = []
    email = (row.get('email') or '').strip().lower()
    phone = (row.get('phone') or '').strip()
    role_raw = (row.get('role') or '').strip()
    password = (row.get('password') or '').strip()
    name = _derive_user_name(row, email)

    if not name:
        errors.append('Name is required (or provide Email so a name can be derived).')
    if not email:
        errors.append('Email is required.')
    else:
        try:
            validate_email(email)
        except DjangoValidationError:
            errors.append('Email format is invalid.')
        if email in seen_emails:
            errors.append('Duplicate email in this file.')
        seen_emails.add(email)

    role = map_role(role_raw)
    if not role:
        errors.append(
            'Role must be Driver, User, Viewer, Police, Officer, Editor, Staff, Admin, or Manager.'
        )
    elif role == 'admin' and not getattr(actor, 'is_superuser', False):
        errors.append('Only a super administrator can import admin accounts.')

    if errors:
        return _err(errors, {'name': name, 'email': email, 'phone': phone, 'role': role or role_raw})

    existing = User.objects.filter(email__iexact=email).first()
    if existing:
        if existing.deleted_at:
            return _skip('Email belongs to a soft-deleted account.', {'email': email})
        return _skip('Email already exists.', {'email': email, 'name': name})

    return _ok({
        'name': name,
        'email': email,
        'phone': phone,
        'role': role,
        'password': password,
    })


def validate_vehicles_row(row: dict[str, str], *, seen_plates: set[str]) -> dict:
    errors: list[str] = []
    plate = (row.get('plate_number') or '').strip().upper()
    vtype_raw = row.get('vehicle_type') or ''
    owner_email = (row.get('owner_email') or '').strip().lower()
    model = (row.get('model') or '').strip() or 'Unknown'
    color = (row.get('color') or '').strip() or 'Unknown'
    year_raw = (row.get('year') or '').strip()

    if not plate:
        errors.append('Plate Number is required.')
    elif plate in seen_plates:
        errors.append('Duplicate plate in this file.')
    else:
        seen_plates.add(plate)

    vtype = map_vehicle_type(vtype_raw)
    if not vtype:
        errors.append('Vehicle Type must be Car, Motorcycle, Truck, Bus, or Tuk-Tuk.')

    owner = None
    owner_id = ''
    if not owner_email:
        errors.append('Owner Email is required.')
    else:
        owner = User.objects.filter(email__iexact=owner_email, role='driver', deleted_at__isnull=True).first()
        if not owner:
            errors.append('Owner Email must match an existing active driver account.')
        else:
            owner_id = str(owner.id)
    year = 2020
    if year_raw:
        try:
            year = int(float(year_raw))
            if year < 1950 or year > 2100:
                errors.append('Year is out of range.')
        except ValueError:
            errors.append('Year must be a number.')

    if errors:
        return _err(errors, {
            'plate_number': plate,
            'vehicle_type': vtype or vtype_raw,
            'owner_email': owner_email,
        })

    if Vehicle.objects.filter(plate_number__iexact=plate).exists():
        return _skip('Plate number already exists.', {'plate_number': plate})

    return _ok({
        'plate_number': plate,
        'vehicle_type': vtype,
        'owner_email': owner_email,
        'owner_id': owner_id,
        'model': model,
        'color': color,
        'year': year,
    })


def validate_signs_row(row: dict[str, str], *, seen_codes: set[str]) -> dict:
    errors: list[str] = []
    code = (row.get('code') or '').strip().upper()
    name = (row.get('name') or '').strip()
    category_raw = row.get('category') or ''
    description = (row.get('description') or '').strip() or name

    if not code:
        errors.append('Code is required.')
    elif code in seen_codes:
        errors.append('Duplicate code in this file.')
    else:
        seen_codes.add(code)

    if not name:
        errors.append('Name is required.')

    category = map_category(category_raw)
    if not category:
        errors.append('Category must be Warning, Prohibitory, Regulatory, Mandatory, or Informative.')

    if errors:
        return _err(errors, {'code': code, 'name': name, 'category': category or category_raw})

    if TrafficSign.objects.filter(sign_code__iexact=code).exists():
        return _skip('Sign code already exists.', {'code': code})

    return _ok({
        'code': code,
        'name': name,
        'category': category,
        'description': description,
    })


def validate_cameras_row(row: dict[str, str], *, seen_codes: set[str]) -> dict:
    errors: list[str] = []
    camera_id = (row.get('camera_id') or '').strip().upper()
    location = (row.get('location') or '').strip()
    road_name = (row.get('road_name') or '').strip()
    rtsp = (row.get('rtsp_url') or '').strip()
    status_raw = (row.get('status') or 'active').strip().lower() or 'active'

    if not camera_id:
        errors.append('Camera ID is required.')
    elif camera_id in seen_codes:
        errors.append('Duplicate Camera ID in this file.')
    else:
        seen_codes.add(camera_id)

    if not location:
        errors.append('Location is required.')
    if not road_name:
        errors.append('Road Name is required.')

    status = CAMERA_STATUS_MAP.get(status_raw)
    if not status:
        errors.append('Status must be Active, Inactive, Offline, or Maintenance.')

    if errors:
        return _err(errors, {
            'camera_id': camera_id,
            'location': location,
            'road_name': road_name,
            'status': status or status_raw,
        })

    if Camera.objects.filter(code__iexact=camera_id).exists():
        return _skip('Camera ID already exists.', {'camera_id': camera_id})

    return _ok({
        'camera_id': camera_id,
        'location': location,
        'road_name': road_name,
        'rtsp_url': rtsp,
        'status': status,
    })


def validate_violations_row(row: dict[str, str], *, seen_keys: set[str]) -> dict:
    errors: list[str] = []
    plate = (row.get('plate_number') or '').strip().upper()
    violation_raw = (row.get('violation') or '').strip()
    date_raw = (row.get('date') or '').strip()
    fine_raw = (row.get('fine') or '').strip()

    if not plate:
        errors.append('Plate Number is required.')
    if not violation_raw:
        errors.append('Violation is required.')
    when = parse_when(date_raw)
    if not when:
        errors.append('Date is required and must be YYYY-MM-DD (or ISO datetime).')

    vtype, observed = map_violation_type(violation_raw)
    fine_amount = None
    if fine_raw:
        try:
            fine_amount = Decimal(fine_raw.replace(',', ''))
            if fine_amount < 0:
                errors.append('Fine must be zero or positive.')
        except InvalidOperation:
            errors.append('Fine must be a number.')

    vehicle = None
    if plate:
        vehicle = Vehicle.objects.select_related('owner', 'driver').filter(plate_number__iexact=plate).first()
        if not vehicle:
            errors.append('Plate Number not found in registered vehicles.')
        elif not vehicle.driver_id and not vehicle.owner_id:
            errors.append('Vehicle has no linked driver/owner.')

    if errors:
        return _err(errors, {
            'plate_number': plate,
            'violation': violation_raw,
            'date': date_raw,
            'fine': fine_raw,
        })

    day_key = when.date().isoformat()
    dedupe = f'{plate}|{day_key}|{(vtype or observed).upper()}'
    if dedupe in seen_keys:
        return _skip('Duplicate violation row in this file.', {'plate_number': plate, 'date': day_key})
    seen_keys.add(dedupe)

    qs = TrafficViolation.objects.filter(plate_detected__iexact=plate, violation_date__date=when.date())
    if vtype:
        qs = qs.filter(violation_type=vtype)
    else:
        qs = qs.filter(observed_action__iexact=observed)
    if qs.exists():
        return _skip('Matching violation already exists for this plate/date.', {
            'plate_number': plate,
            'date': day_key,
        })

    driver_profile = vehicle.driver
    if driver_profile is None and vehicle.owner_id:
        from users.models import Driver
        driver_profile = Driver.objects.filter(user_id=vehicle.owner_id).first()
    if driver_profile is None:
        return _err(['Could not resolve driver profile for this vehicle.'], {'plate_number': plate})

    return _ok({
        'plate_number': plate,
        'violation_type': vtype,
        'observed_action': observed,
        'violation_date': when.isoformat(),
        'fine_amount': str(fine_amount) if fine_amount is not None else '',
        'vehicle_id': str(vehicle.id),
        'driver_id': str(driver_profile.id),
        'owner_user_id': str(vehicle.owner_id or driver_profile.user_id),
    })


def validate_rows(import_type: str, rows: list[dict[str, str]], *, actor) -> list[dict[str, Any]]:
    report: list[dict[str, Any]] = []
    seen_emails: set[str] = set()
    seen_plates: set[str] = set()
    seen_codes: set[str] = set()
    seen_cameras: set[str] = set()
    seen_violations: set[str] = set()

    for idx, row in enumerate(rows, start=2):  # spreadsheet row numbers (header = 1)
        if import_type == 'users':
            result = validate_users_row(row, actor=actor, seen_emails=seen_emails)
        elif import_type == 'vehicles':
            result = validate_vehicles_row(row, seen_plates=seen_plates)
        elif import_type == 'signs':
            result = validate_signs_row(row, seen_codes=seen_codes)
        elif import_type == 'cameras':
            result = validate_cameras_row(row, seen_codes=seen_cameras)
        elif import_type == 'violations':
            result = validate_violations_row(row, seen_keys=seen_violations)
        else:
            result = _err([f'Unsupported import type: {import_type}'])
        report.append({
            'row': idx,
            'status': result['status'],
            'errors': result['errors'],
            'data': result['data'],
        })
    return report
