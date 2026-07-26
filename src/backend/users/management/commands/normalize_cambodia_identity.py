"""Normalize Cambodia identity fields: emails, phones, driver licenses, vehicle plates.

Preserves thesis demo login emails and any --keep-email addresses.
Cascades plate renames into fines / violations / AI logs / unknown vehicles.
"""
from __future__ import annotations

import hashlib
import re
import uuid

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

User = get_user_model()

# Thesis login emails — keep stable so demos still work.
PRESERVE_EMAILS = {
    'admin@camtraffic.demo',
    'officer@camtraffic.demo',
    'driver@camtraffic.demo',
    'driver2@camtraffic.demo',
}

PLATE_LETTERS = [c for c in 'ABCDEFGHJKLMNPQRSTUVWXYZ']  # skip I/O
VEHICLE_CATEGORY = {
    'motorcycle': '1',
    'car': '2',
    'suv': '2',
    'van': '2',
    'truck': '3',
    'bus': '3',
    'tuk-tuk': '4',
}

# Common .com mail providers used in Cambodia.
EMAIL_DOMAINS = ('gmail.com', 'yahoo.com', 'outlook.com')

LICENSE_RE = re.compile(r'^DL-KH-\d{4}-\d{6}$')
PLATE_RE = re.compile(r'^[1-4][A-Z]{2} \d{4}$')
PHONE_RE = re.compile(
    r'^\+855 (?:12|15|16|17|61|67|68|69|70|71|76|77|78|79|81|85|87|89|92|95|96|97|98) \d{3} \d{3}$',
)
MOBILE_PREFIXES = [
    '12', '15', '16', '17', '61', '67', '68', '69', '70', '71',
    '76', '77', '78', '79', '81', '85', '87', '89', '92', '95', '96', '97', '98',
]


def _stable_int(seed: str, modulo: int) -> int:
    digest = hashlib.sha256(seed.encode('utf-8')).hexdigest()
    return int(digest[:12], 16) % modulo


def _slug_name(full_name: str) -> tuple[str, str]:
    parts = re.sub(r'[^A-Za-z\s]', '', full_name or '').split()
    if len(parts) >= 2:
        return parts[0].lower(), parts[-1].lower()
    if parts:
        return parts[0].lower(), 'kh'
    return 'citizen', 'kh'


def _pick_phone(seed: str) -> str:
    prefix = MOBILE_PREFIXES[_stable_int(f'{seed}:pfx', len(MOBILE_PREFIXES))]
    mid = 100 + _stable_int(f'{seed}:mid', 900)
    last = 100 + _stable_int(f'{seed}:end', 900)
    return f'+855 {prefix} {mid:03d} {last:03d}'


def _needs_realistic_email(email: str, full_name: str = '') -> bool:
    """Rebuild when not first.last@*.com matching the user's display name."""
    e = (email or '').strip().lower()
    if not e or '@' not in e:
        return True
    if e in PRESERVE_EMAILS:
        return False
    local, domain = e.split('@', 1)
    if not domain.endswith('.com'):
        return True
    first, last = _slug_name(full_name)
    expected = f'{first}.{last}'
    if local == expected or re.fullmatch(rf'{re.escape(expected)}\d{{0,3}}', local):
        return False
    return True


def _build_email(full_name: str, role: str, seed: str, used: set[str]) -> str:
    """Build first.last@gmail.com (or yahoo/outlook) from the user's name."""
    del role  # name-based only; role does not affect domain
    first, last = _slug_name(full_name)
    domain = 'gmail.com'
    if _stable_int(f'{seed}:gmailbias', 10) >= 8:
        domain = EMAIL_DOMAINS[_stable_int(f'{seed}:domain', len(EMAIL_DOMAINS))]
    base = f'{first}.{last}'
    candidate = f'{base}@{domain}'
    n = 0
    while candidate in used:
        n += 1
        suffix = 1 + _stable_int(f'{seed}:email:{n}', 98)
        candidate = f'{base}{suffix}@{domain}'
    return candidate


def _build_license(seed: str, used: set[str]) -> str:
    year = 2022 + _stable_int(f'{seed}:licyear', 5)
    for attempt in range(200):
        num = 100000 + _stable_int(f'{seed}:licnum:{attempt}', 900000)
        lic = f'DL-KH-{year}-{num:06d}'
        if lic not in used:
            return lic
    return f'DL-KH-{year}-{uuid.uuid4().hex[:6].upper()}'


def _build_plate(seed: str, vehicle_type: str, used: set[str]) -> str:
    cat = VEHICLE_CATEGORY.get((vehicle_type or 'car').lower(), '2')
    for attempt in range(500):
        a = PLATE_LETTERS[_stable_int(f'{seed}:pa:{attempt}', len(PLATE_LETTERS))]
        b = PLATE_LETTERS[_stable_int(f'{seed}:pb:{attempt}', len(PLATE_LETTERS))]
        num = 1000 + _stable_int(f'{seed}:pn:{attempt}', 9000)
        plate = f'{cat}{a}{b} {num}'
        if plate not in used:
            return plate
    return f'{cat}ZZ {1000 + _stable_int(seed, 9000)}'


def _cascade_plate(old: str, new: str) -> dict[str, int]:
    from ai_detection.models import AIDetectionLog
    from fines.models import Fine
    from unknown_vehicles.models import UnknownVehicle
    from violations.models import TrafficViolation

    return {
        'fines': Fine.objects.filter(vehicle_plate=old).update(vehicle_plate=new),
        'violations': TrafficViolation.objects.filter(plate_detected=old).update(plate_detected=new),
        'detections': AIDetectionLog.objects.filter(detected_plate=old).update(detected_plate=new),
        'unknown': UnknownVehicle.objects.filter(plate_detected=old).update(plate_detected=new),
    }


class Command(BaseCommand):
    help = (
        'Make user emails, phones, driver licenses, and vehicle plates look like real Cambodia data'
    )

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true')
        parser.add_argument(
            '--keep-email',
            action='append',
            default=[],
            help='Extra email to preserve (repeatable)',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry = options['dry_run']
        preserve = set(PRESERVE_EMAILS)
        keep = options.get('keep_email') or []
        preserve.update(e.strip().lower() for e in keep if e)

        from users.models import Driver
        from vehicles.models import Vehicle

        users = list(User.objects.all().order_by('role', 'email'))
        used_emails = {(u.email or '').strip().lower() for u in users if u.email}

        email_updates = 0
        phone_updates = 0
        license_updates = 0
        plate_updates = 0

        for user in users:
            old_email = (user.email or '').strip().lower()
            seed = str(user.pk)
            changes: dict[str, str] = {}

            if old_email not in preserve and _needs_realistic_email(old_email, user.full_name):
                used_emails.discard(old_email)
                new_email = _build_email(user.full_name, user.role, seed, used_emails)
                used_emails.add(new_email)
                if new_email != old_email:
                    changes['email'] = new_email
                    email_updates += 1
            else:
                used_emails.add(old_email)

            phone = (user.phone or '').strip()
            if not PHONE_RE.match(phone):
                changes['phone'] = _pick_phone(seed)
                phone_updates += 1

            if changes:
                self.stdout.write(
                    f'  user {old_email} ({user.role}): '
                    + ', '.join(f'{k}={v!r}' for k, v in changes.items()),
                )
                if not dry:
                    if 'email' in changes:
                        user.email = f'tmp.{uuid.uuid4().hex}@normalize.local'
                        user.save(update_fields=['email'])
                        user.email = changes['email']
                        fields = ['email']
                        if 'phone' in changes:
                            user.phone = changes['phone']
                            fields.append('phone')
                        user.save(update_fields=fields)
                    else:
                        for key, value in changes.items():
                            setattr(user, key, value)
                        user.save(update_fields=list(changes.keys()))

        used_licenses: set[str] = set()
        for driver in Driver.objects.select_related('user').all():
            seed = str(driver.user_id)
            current = (driver.license_no or '').strip()
            email = (driver.user.email or '').strip().lower()

            if email == 'driver@camtraffic.demo':
                new_lic = 'DL-KH-2024-001234'
            elif email == 'driver2@camtraffic.demo':
                new_lic = 'DL-KH-2024-002345'
            elif LICENSE_RE.match(current) and current not in used_licenses:
                new_lic = current
            else:
                new_lic = _build_license(seed, used_licenses)

            used_licenses.add(new_lic)
            if new_lic != current or (driver.user.license_no or '') != new_lic:
                license_updates += 1
                self.stdout.write(f'  license {email}: {current!r} → {new_lic!r}')
                if not dry:
                    driver.license_no = new_lic
                    driver.save(update_fields=['license_no'])
                    User.objects.filter(pk=driver.user_id).update(license_no=new_lic)

        if not dry:
            cleared = (
                User.objects.exclude(role='driver')
                .exclude(license_no__isnull=True)
                .exclude(license_no='')
                .update(license_no=None)
            )
            if cleared:
                self.stdout.write(f'  cleared license_no on {cleared} non-driver users')

        used_plates = {(v.plate_number or '').strip() for v in Vehicle.objects.all()}
        for vehicle in Vehicle.objects.all().order_by('id'):
            old = (vehicle.plate_number or '').strip()
            seed = str(vehicle.pk)
            if PLATE_RE.match(old):
                continue
            used_plates.discard(old)
            new = _build_plate(seed, vehicle.vehicle_type, used_plates)
            used_plates.add(new)
            plate_updates += 1
            self.stdout.write(f'  plate {old!r} → {new!r} ({vehicle.vehicle_type})')
            if not dry:
                vehicle.plate_number = f'TMP{uuid.uuid4().hex[:8].upper()}'
                vehicle.save(update_fields=['plate_number'])
                vehicle.plate_number = new
                vehicle.save(update_fields=['plate_number'])
                cascaded = _cascade_plate(old, new)
                if any(cascaded.values()):
                    self.stdout.write(f'    cascaded {cascaded}')

        mode = 'DRY-RUN' if dry else 'APPLIED'
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'[{mode}] emails={email_updates} phones={phone_updates} '
            f'licenses={license_updates} plates={plate_updates}',
        ))
        self.stdout.write('Preserved login emails: ' + ', '.join(sorted(preserve)))
        if dry:
            self.stdout.write('Re-run without --dry-run to apply.')
            transaction.set_rollback(True)
