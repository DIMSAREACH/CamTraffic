"""
Load data/pdf_seed_demo/seed_bundle.json into live Django models.

Maps PDF-based Phnom Penh location entities + synthetic private records so
Admin / Officer / Driver modules share consistent FK-linked demo data.

Schema notes:
- Intersections → Road(road_type='intersection')
- payments → Fine payment fields (no payments table)
- Police users → Officer profiles (required for violation/fine issue flow)
"""
from __future__ import annotations

import io
import json
import uuid
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from ai_detection.models import AIDetectionLog
from appeals.models import ViolationAppeal
from fines.models import Fine
from infrastructure.models import Camera, PoliceStation, Road, TrafficSignal
from traffic_signs.models import TrafficSign
from users.models import Driver, Officer
from vehicles.models import Vehicle
from violations.models import TrafficViolation

User = get_user_model()

DEMO_PASSWORD = 'CamTraffic@2026!'


def _repo_root() -> Path:
    root = getattr(settings, 'REPO_ROOT', None)
    if root:
        return Path(root).resolve()
    base = Path(settings.BASE_DIR).resolve()
    return base.parent.parent  # src/backend → CamTraffic


BUNDLE_PATH = _repo_root() / 'data' / 'pdf_seed_demo' / 'seed_bundle.json'


def _parse_dt(value):
    if not value:
        return timezone.now()
    if isinstance(value, datetime):
        dt = value
    else:
        dt = parse_datetime(str(value).replace('Z', '+00:00'))
    if dt is None:
        return timezone.now()
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def _placeholder_jpeg(name: str) -> SimpleUploadedFile:
    try:
        from PIL import Image
    except ImportError:
        # Minimal valid 1x1 JPEG bytes
        raw = (
            b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
            b'\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t'
            b'\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a'
            b'\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342'
            b'\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00'
            b'\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00'
            b'\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b'
            b'\xff\xda\x00\x08\x01\x01\x00\x00?\x00\x7f\xff\xd9'
        )
        return SimpleUploadedFile(name, raw, content_type='image/jpeg')

    img = Image.new('RGB', (640, 360), color=(42, 92, 138))
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=75)
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type='image/jpeg')


class Command(BaseCommand):
    help = 'Load PDF-based Phnom Penh demo seed into Django (FK-consistent across modules)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--bundle',
            type=str,
            default=str(BUNDLE_PATH),
            help='Path to seed_bundle.json',
        )
        parser.add_argument(
            '--password',
            type=str,
            default=DEMO_PASSWORD,
            help='Password for seeded @camtraffic.demo users',
        )
        parser.add_argument(
            '--skip-private',
            action='store_true',
            help='Only load roads/intersections/cameras/signals/signs (skip users/violations)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Allow when DEBUG=False (requires ALLOW_DEMO_SEED=true)',
        )

    def _assert_allowed(self, force: bool) -> None:
        import os
        allow = os.getenv('ALLOW_DEMO_SEED', '').lower() in ('1', 'true', 'yes')
        if settings.DEBUG or (allow and force):
            return
        raise CommandError(
            'Refusing load_pdf_seed_demo when DEBUG=False. '
            'Set ALLOW_DEMO_SEED=true and pass --force for defense/demo hosts only.',
        )

    def handle(self, *args, **options):
        self._assert_allowed(options['force'])
        path = Path(options['bundle'])
        if not path.is_file():
            raise CommandError(f'Seed bundle not found: {path}')

        bundle = json.loads(path.read_text(encoding='utf-8'))
        password = options['password']
        skip_private = options['skip_private']

        self.stdout.write(self.style.MIGRATE_HEADING('Loading PDF seed demo…'))
        self.stdout.write(f'  Bundle: {path}')

        with transaction.atomic():
            station = self._ensure_station()
            road_map = self._load_roads(bundle.get('roads') or [])
            road_map.update(self._load_intersections(bundle.get('intersections') or [], road_map))
            self._load_signs(bundle.get('traffic_signs_31') or [])
            self._load_signals(bundle.get('traffic_signals') or [], road_map)
            camera_map = self._load_cameras(bundle.get('cameras') or [], road_map)

            counts = {
                'roads': Road.objects.filter(road_code__startswith='PP-RD-').count()
                + Road.objects.filter(road_code__startswith='PP-INT-').count(),
                'cameras': Camera.objects.filter(code__startswith='CAM').count(),
                'signals': TrafficSignal.objects.filter(signal_code__startswith='SIG-PP-').count(),
            }

            if skip_private:
                self._print_summary(counts, private=False)
                return

            user_map, officer_map, driver_map = self._load_users_drivers(
                bundle.get('users') or [],
                bundle.get('drivers') or [],
                station,
                password,
            )
            vehicle_map = self._load_vehicles(bundle.get('vehicles') or [], driver_map, user_map)
            detection_map = self._load_detections(
                bundle.get('ai_detection_logs') or [],
                user_map,
                vehicle_map,
            )
            violation_map = self._load_violations(
                bundle.get('traffic_violations') or [],
                driver_map,
                vehicle_map,
                officer_map,
                camera_map,
                road_map,
                detection_map,
            )
            fine_map = self._load_fines(
                bundle.get('fines') or [],
                bundle.get('payments') or [],
                violation_map,
                user_map,
            )
            self._load_appeals(
                bundle.get('violation_appeals') or [],
                violation_map,
                fine_map,
                driver_map,
                user_map,
            )
            self._link_orphans(officer_map, camera_map, road_map, vehicle_map)

        counts.update({
            'users_demo': User.objects.filter(email__endswith='@camtraffic.demo').count(),
            'drivers': Driver.objects.filter(license_no__startswith='PP-').count(),
            'vehicles': Vehicle.objects.filter(plate_number__startswith='PP-').count(),
            'violations': TrafficViolation.objects.filter(
                location__icontains='Phnom Penh',
            ).count(),
            'fines': Fine.objects.filter(location__icontains='Phnom Penh').count(),
            'appeals': ViolationAppeal.objects.count(),
            'ai_logs': AIDetectionLog.objects.filter(detected_plate__startswith='PP-').count(),
        })
        self._print_summary(counts, private=True)
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Demo logins (password shared):'))
        self.stdout.write(f'  admin@camtraffic.demo / {password}  (also run: npm run seed:demo)')
        self.stdout.write(f'  officer@camtraffic.demo / {password}')
        self.stdout.write(f'  driver@camtraffic.demo / {password}')
        self.stdout.write('  PDF pack: driver001@camtraffic.demo … police001@camtraffic.demo')

    def _ensure_station(self) -> PoliceStation:
        station, _ = PoliceStation.objects.get_or_create(
            code='PP-HQ',
            defaults={
                'name': 'Phnom Penh Traffic Police HQ',
                'city': 'Phnom Penh',
                'region': 'Capital',
                'address': 'Monivong Blvd, Phnom Penh',
                'phone': '+855 23 000 000',
                'status': 'active',
            },
        )
        return station

    def _load_roads(self, rows: list[dict]) -> dict[str, Road]:
        road_map: dict[str, Road] = {}
        created = updated = 0
        for row in rows:
            rid = str(row['id'])
            defaults = {
                'name': row['name'],
                'road_type': row.get('road_type') or 'urban',
                'length_km': Decimal(str(row['length_km'])) if row.get('length_km') is not None else None,
                'speed_limit': int(row.get('speed_limit') or 50),
                'lanes': row.get('lanes'),
                'direction': row.get('direction') or '',
                'description': row.get('description') or '',
                'city': row.get('city') or 'Phnom Penh',
                'region': row.get('region') or 'Phnom Penh',
                'province': row.get('province') or 'Phnom Penh',
                'district': row.get('district') or '',
                'commune': row.get('commune') or '',
                'village': row.get('village') or '',
                'country': row.get('country') or 'Cambodia',
                'status': row.get('status') or 'active',
                'is_deleted': bool(row.get('is_deleted', False)),
            }
            obj, was_created = Road.objects.update_or_create(
                road_code=row.get('road_code') or f'PP-RD-{rid[:8]}',
                defaults=defaults,
            )
            road_map[rid] = obj
            created += int(was_created)
            updated += int(not was_created)
        self.stdout.write(self.style.SUCCESS(f'  Roads: +{created} / ~{updated}'))
        return road_map

    def _load_intersections(self, rows: list[dict], road_map: dict[str, Road]) -> dict[str, Road]:
        """Store intersections as Road rows with road_type=intersection."""
        out: dict[str, Road] = {}
        created = updated = 0
        for row in rows:
            code = f"PP-INT-{str(row['id']).replace('INT-', '')}"
            anchor_id = str(row.get('anchor_road_id') or '')
            anchor = road_map.get(anchor_id)
            defaults = {
                'name': row['name'],
                'road_type': 'intersection',
                'speed_limit': 40,
                'description': f"Intersection from JICA/MPWT PDF (anchor: {anchor.name if anchor else 'n/a'})",
                'city': row.get('city') or 'Phnom Penh',
                'region': row.get('khan') or '',
                'province': 'Phnom Penh',
                'district': row.get('khan') or '',
                'country': 'Cambodia',
                'status': 'active',
            }
            obj, was_created = Road.objects.update_or_create(road_code=code, defaults=defaults)
            out[str(row['id'])] = obj
            # Also map by name for camera street lookups
            road_map[str(row['id'])] = obj
            created += int(was_created)
            updated += int(not was_created)
        self.stdout.write(self.style.SUCCESS(f'  Intersections→roads: +{created} / ~{updated}'))
        return out

    def _load_signs(self, rows: list[dict]) -> None:
        created = updated = 0
        for row in rows:
            code = (row.get('sign_code') or '').strip()
            if not code:
                continue
            _, was_created = TrafficSign.objects.update_or_create(
                sign_code=code,
                defaults={
                    'sign_name': row.get('sign_name') or row.get('sign_name_en') or code,
                    'sign_name_km': row.get('sign_name_km') or '',
                    'sign_name_en': row.get('sign_name_en') or '',
                    'description': row.get('description') or row.get('description_en') or code,
                    'description_en': row.get('description_en') or '',
                    'guidance': row.get('guidance') or '',
                    'guidance_en': row.get('guidance_en') or '',
                    'category': row.get('category') or 'prohibitory',
                    'penalty': row.get('penalty') or '',
                },
            )
            created += int(was_created)
            updated += int(not was_created)
        self.stdout.write(self.style.SUCCESS(f'  Signs upserted: +{created} / ~{updated}'))

    def _load_signals(self, rows: list[dict], road_map: dict[str, Road]) -> None:
        created = updated = 0
        for row in rows:
            road = road_map.get(str(row.get('road_id')))
            if not road:
                # Fall back to any PDF road
                road = next(iter(road_map.values()), None)
            if not road:
                continue
            timing = row.get('timing_sequence') or {}
            if isinstance(timing, str):
                try:
                    timing = json.loads(timing)
                except json.JSONDecodeError:
                    timing = {}
            _, was_created = TrafficSignal.objects.update_or_create(
                road=road,
                signal_code=row.get('signal_code') or f"SIG-{uuid.uuid4().hex[:6]}",
                defaults={
                    'cycle_duration': int(row.get('cycle_duration') or 120),
                    'timing_sequence': timing if isinstance(timing, dict) else {},
                    'status': row.get('status') or 'active',
                },
            )
            created += int(was_created)
            updated += int(not was_created)
        self.stdout.write(self.style.SUCCESS(f'  Signals: +{created} / ~{updated}'))

    def _load_cameras(self, rows: list[dict], road_map: dict[str, Road]) -> dict[str, Camera]:
        camera_map: dict[str, Camera] = {}
        created = updated = 0
        for row in rows:
            road = road_map.get(str(row.get('road_id')))
            if not road:
                road = next(iter(road_map.values()), None)
            if not road:
                continue
            code = row.get('code') or f"CAM{uuid.uuid4().hex[:6]}"
            defaults = {
                'road': road,
                'name': row.get('name') or code,
                'model': row.get('model') or 'Hikvision iDS-TCD402',
                'camera_type': row.get('camera_type') or 'fixed',
                'status': row.get('status') or 'active',
                'frame_source_url': row.get('frame_source_url') or '',
                'province': row.get('province') or 'Phnom Penh',
                'district': row.get('district') or '',
                'street': row.get('street') or '',
                'ai_enabled': True,
                'brand': 'Hikvision',
            }
            obj, was_created = Camera.objects.update_or_create(code=code, defaults=defaults)
            camera_map[str(row['id'])] = obj
            created += int(was_created)
            updated += int(not was_created)
        self.stdout.write(self.style.SUCCESS(f'  Cameras: +{created} / ~{updated}'))
        return camera_map

    def _load_users_drivers(
        self,
        users: list[dict],
        drivers: list[dict],
        station: PoliceStation,
        password: str,
    ) -> tuple[dict[str, User], dict[str, Officer], dict[str, Driver]]:
        user_map: dict[str, User] = {}
        officer_map: dict[str, Officer] = {}
        driver_map: dict[str, Driver] = {}
        u_created = d_created = o_created = 0

        for row in users:
            email = (row.get('email') or '').strip().lower()
            if not email:
                continue
            role = row.get('role') or 'driver'
            defaults = {
                'full_name': row.get('full_name') or email.split('@')[0],
                'role': role,
                'phone': row.get('phone') or '',
                'address': row.get('address') or 'Phnom Penh',
                'license_no': row.get('license_no') or None,
                'auth_provider': 'email',
                'email_verified': True,
                'is_active': True,
                'is_staff': role == 'admin',
                'is_superuser': False,
            }
            user, was_created = User.objects.update_or_create(email=email, defaults=defaults)
            if was_created or not user.has_usable_password():
                user.set_password(password)
                user.save(update_fields=['password'])
            else:
                # Always reset PDF pack passwords so demo logins work
                if email.endswith('@camtraffic.demo'):
                    user.set_password(password)
                    user.save(update_fields=['password'])
            user_map[str(row['id'])] = user
            u_created += int(was_created)

            if role == 'police':
                badge = f"PDF-{email.split('@')[0].upper()}"
                officer, oc = Officer.objects.update_or_create(
                    user=user,
                    defaults={
                        'badge_no': badge[:50],
                        'rank': 'Traffic Officer',
                        'department': 'Traffic Enforcement',
                        'station': station,
                        'status': 'active',
                    },
                )
                officer_map[str(row['id'])] = officer
                o_created += int(oc)

        driver_by_user = {str(d['user_id']): d for d in drivers}
        for uid, row in driver_by_user.items():
            user = user_map.get(uid)
            if not user:
                continue
            license_no = row.get('license_no') or f'PP-D-{uid[:8]}'
            expiry = row.get('license_expiry')
            dob = row.get('date_of_birth')
            national_id = (row.get('national_id') or '').strip() or None
            # Avoid unique collisions if another driver already owns this national_id
            if national_id and Driver.objects.filter(national_id=national_id).exclude(user=user).exists():
                national_id = None
            if Driver.objects.filter(license_no=license_no).exclude(user=user).exists():
                license_no = f'PP-{user.email.split("@")[0][-8:]}-{uid[:4]}'
            driver, dc = Driver.objects.update_or_create(
                user=user,
                defaults={
                    'license_no': license_no,
                    'national_id': national_id,
                    'license_expiry': date.fromisoformat(expiry) if expiry else date(2029, 12, 31),
                    'date_of_birth': date.fromisoformat(dob) if dob else None,
                    'kyc_status': row.get('kyc_status') or 'approved',
                    'status': row.get('status') or 'active',
                    'demerit_points': int(row.get('demerit_points') or 0),
                },
            )
            driver_map[str(row['id'])] = driver
            d_created += int(dc)

        self.stdout.write(self.style.SUCCESS(
            f'  Users: +{u_created} · Drivers: +{d_created} · Officers: +{o_created}'
        ))
        return user_map, officer_map, driver_map

    def _load_vehicles(
        self,
        rows: list[dict],
        driver_map: dict[str, Driver],
        user_map: dict[str, User],
    ) -> dict[str, Vehicle]:
        vehicle_map: dict[str, Vehicle] = {}
        created = updated = 0
        for row in rows:
            driver = driver_map.get(str(row.get('driver_id')))
            owner = user_map.get(str(row.get('owner_id')))
            if driver and not owner:
                owner = driver.user
            if not owner:
                continue
            plate = row.get('plate_number') or f"PP-{uuid.uuid4().hex[:4].upper()}"
            obj, was_created = Vehicle.objects.update_or_create(
                plate_number=plate,
                defaults={
                    'driver': driver,
                    'owner': owner,
                    'vehicle_type': row.get('vehicle_type') or 'car',
                    'make': row.get('make') or '',
                    'model': row.get('model') or 'Unknown',
                    'color': row.get('color') or 'White',
                    'year': int(row.get('year') or 2020),
                    'status': row.get('status') or 'active',
                },
            )
            vehicle_map[str(row['id'])] = obj
            created += int(was_created)
            updated += int(not was_created)
        self.stdout.write(self.style.SUCCESS(f'  Vehicles: +{created} / ~{updated}'))
        return vehicle_map

    def _load_detections(
        self,
        rows: list[dict],
        user_map: dict[str, User],
        vehicle_map: dict[str, Vehicle],
    ) -> dict[str, AIDetectionLog]:
        detection_map: dict[str, AIDetectionLog] = {}
        created = 0
        for i, row in enumerate(rows):
            user = user_map.get(str(row.get('user_id')))
            if not user:
                user = next(iter(user_map.values()), None)
            if not user:
                continue
            # Idempotent: skip if a PDF-pack detection with same plate+sign already exists for user
            plate = row.get('detected_plate') or ''
            sign = row.get('detected_sign') or 'Unknown'
            existing = AIDetectionLog.objects.filter(
                user=user,
                detected_sign=sign,
                detected_plate=plate,
                model_version='pdf-seed',
            ).first()
            if existing:
                detection_map[str(row['id'])] = existing
                continue

            vehicles_json = row.get('detected_vehicles') or []
            if isinstance(vehicles_json, str):
                try:
                    vehicles_json = json.loads(vehicles_json)
                except json.JSONDecodeError:
                    vehicles_json = []
            ocr = row.get('plate_ocr_details') or []
            if isinstance(ocr, str):
                try:
                    ocr = json.loads(ocr)
                except json.JSONDecodeError:
                    ocr = []

            matched = vehicle_map.get(str(row.get('matched_vehicle_id')))
            log = AIDetectionLog(
                user=user,
                detected_sign=sign,
                confidence=float(row.get('confidence') or 85),
                description=row.get('description') or '',
                guidance=row.get('guidance') or '',
                processing_time=float(row.get('processing_time') or 1.0),
                review_status=row.get('review_status') or 'pending',
                model_version='pdf-seed',
                detected_vehicles=vehicles_json if isinstance(vehicles_json, list) else [],
                vehicle_count=int(row.get('vehicle_count') or 0),
                detected_plate=plate,
                plate_confidence=float(row.get('plate_confidence') or 0),
                plate_type=row.get('plate_type') or '',
                plate_ocr_details=ocr if isinstance(ocr, list) else [],
                matched_vehicle=matched,
            )
            log.uploaded_image = _placeholder_jpeg(f'pdf_seed_{i+1:03d}.jpg')
            log.save()
            created_at = _parse_dt(row.get('created_at'))
            AIDetectionLog.objects.filter(pk=log.pk).update(created_at=created_at)
            detection_map[str(row['id'])] = log
            created += 1
        self.stdout.write(self.style.SUCCESS(f'  AI detections: +{created}'))
        return detection_map

    def _load_violations(
        self,
        rows: list[dict],
        driver_map: dict[str, Driver],
        vehicle_map: dict[str, Vehicle],
        officer_map: dict[str, Officer],
        camera_map: dict[str, Camera],
        road_map: dict[str, Road],
        detection_map: dict[str, AIDetectionLog],
    ) -> dict[str, TrafficViolation]:
        violation_map: dict[str, TrafficViolation] = {}
        officers = list(officer_map.values()) or list(Officer.objects.filter(status='active')[:20])
        created = updated = 0
        for i, row in enumerate(rows):
            driver = driver_map.get(str(row.get('driver_id')))
            if not driver:
                continue
            vehicle = vehicle_map.get(str(row.get('vehicle_id')))
            camera = camera_map.get(str(row.get('camera_id')))
            road = road_map.get(str(row.get('road_id')))
            ai_log = detection_map.get(str(row.get('ai_detection_log_id')))
            officer = officers[i % len(officers)] if officers else None

            plate = row.get('plate_detected') or (vehicle.plate_number if vehicle else '')
            loc = row.get('location') or 'Phnom Penh'
            vdate = _parse_dt(row.get('violation_date') or row.get('created_at'))
            vtype = row.get('violation_type') or 'NO_PARKING'

            existing = TrafficViolation.objects.filter(
                driver=driver,
                plate_detected=plate,
                location=loc,
                violation_type=vtype,
            ).first()
            defaults = {
                'vehicle': vehicle,
                'officer': officer,
                'camera': camera,
                'road': road,
                'ai_detection_log': ai_log,
                'observed_action': row.get('observed_action') or '',
                'detected_sign_code': row.get('detected_sign_code') or '',
                'detected_class_key': row.get('detected_class_key') or '',
                'violation_date': vdate,
                'description': row.get('description') or '',
                'officer_note': row.get('officer_note') or '',
                'ai_confidence_score': Decimal(str(row.get('ai_confidence_score') or 85)),
                'plate_detected': plate,
                'status': row.get('status') or 'pending_review',
                'bbox_coords': {},
            }
            if existing:
                for k, v in defaults.items():
                    setattr(existing, k, v)
                existing.save()
                violation_map[str(row['id'])] = existing
                updated += 1
            else:
                obj = TrafficViolation.objects.create(
                    driver=driver,
                    violation_type=vtype,
                    location=loc,
                    **defaults,
                )
                violation_map[str(row['id'])] = obj
                created += 1
        self.stdout.write(self.style.SUCCESS(f'  Violations: +{created} / ~{updated}'))
        return violation_map

    def _load_fines(
        self,
        rows: list[dict],
        payments: list[dict],
        violation_map: dict[str, TrafficViolation],
        user_map: dict[str, User],
    ) -> dict[str, Fine]:
        pay_by_fine = {str(p.get('fine_id')): p for p in payments}
        fine_map: dict[str, Fine] = {}
        created = updated = 0
        for row in rows:
            violation = violation_map.get(str(row.get('violation_id')))
            driver_user = user_map.get(str(row.get('driver_id')))
            police = user_map.get(str(row.get('police_id')))
            if not driver_user and violation:
                driver_user = violation.driver.user
            if not driver_user:
                continue

            pay = pay_by_fine.get(str(row.get('id')), {})
            status = row.get('status') or 'pending'
            payment_method = row.get('payment_method') or pay.get('payment_method') or ''
            payment_reference = row.get('payment_reference') or pay.get('payment_reference') or ''
            paid_at = row.get('paid_at') or pay.get('paid_at')
            due = row.get('due_date')
            defaults = {
                'violation': violation,
                'police': police,
                'amount': Decimal(str(row.get('amount') or 20000)),
                'reason': row.get('reason') or 'Traffic violation fine',
                'status': status,
                'location': row.get('location') or (violation.location if violation else 'Phnom Penh'),
                'vehicle_plate': row.get('vehicle_plate') or '',
                'due_date': date.fromisoformat(due) if due else None,
                'payment_method': payment_method,
                'payment_reference': payment_reference,
                'paid_at': _parse_dt(paid_at) if paid_at else None,
            }

            existing_fine = Fine.objects.filter(violation=violation).first() if violation else None
            if existing_fine:
                for k, v in defaults.items():
                    setattr(existing_fine, k, v)
                existing_fine.driver = driver_user
                existing_fine.save()
                fine_map[str(row['id'])] = existing_fine
                updated += 1
                continue

            fine = Fine.objects.create(driver=driver_user, **defaults)
            fine_map[str(row['id'])] = fine
            created += 1
        self.stdout.write(self.style.SUCCESS(f'  Fines: +{created} / ~{updated}'))
        return fine_map

    def _load_appeals(
        self,
        rows: list[dict],
        violation_map: dict[str, TrafficViolation],
        fine_map: dict[str, Fine],
        driver_map: dict[str, Driver],
        user_map: dict[str, User],
    ) -> None:
        created = skipped = 0
        for row in rows:
            violation = violation_map.get(str(row.get('violation_id')))
            driver = driver_map.get(str(row.get('driver_id')))
            if not violation or not driver:
                skipped += 1
                continue
            if ViolationAppeal.objects.filter(violation=violation, driver=driver).exists():
                skipped += 1
                continue
            ViolationAppeal.objects.create(
                violation=violation,
                fine=fine_map.get(str(row.get('fine_id'))),
                driver=driver,
                reason=row.get('reason') or 'Driver requests review.',
                status=row.get('status') or 'pending',
                review_date=_parse_dt(row.get('review_date')) if row.get('review_date') else None,
                reviewed_by=user_map.get(str(row.get('reviewed_by_id'))),
                officer_comments=row.get('officer_comments') or '',
            )
            created += 1
        self.stdout.write(self.style.SUCCESS(f'  Appeals: +{created} (skip {skipped})'))

    def _link_orphans(
        self,
        officer_map: dict[str, Officer],
        camera_map: dict[str, Camera],
        road_map: dict[str, Road],
        vehicle_map: dict[str, Vehicle],
    ) -> None:
        officers = list(officer_map.values()) or list(Officer.objects.filter(status='active'))
        cameras = list(camera_map.values()) or list(Camera.objects.filter(status='active')[:30])
        roads = list(road_map.values()) or list(Road.objects.filter(is_deleted=False)[:50])
        vehicles = list(vehicle_map.values())

        fixed = 0
        if officers:
            for i, v in enumerate(TrafficViolation.objects.filter(officer__isnull=True)[:200]):
                v.officer = officers[i % len(officers)]
                v.save(update_fields=['officer'])
                fixed += 1
        if cameras:
            for i, v in enumerate(TrafficViolation.objects.filter(camera__isnull=True)[:200]):
                v.camera = cameras[i % len(cameras)]
                v.save(update_fields=['camera'])
                fixed += 1
        if roads:
            for i, v in enumerate(TrafficViolation.objects.filter(road__isnull=True)[:200]):
                v.road = roads[i % len(roads)]
                v.save(update_fields=['road'])
                fixed += 1
        if vehicles:
            for i, v in enumerate(TrafficViolation.objects.filter(vehicle__isnull=True)[:200]):
                v.vehicle = vehicles[i % len(vehicles)]
                if not v.plate_detected:
                    v.plate_detected = v.vehicle.plate_number
                v.save(update_fields=['vehicle', 'plate_detected'])
                fixed += 1

        # Link fines missing violation when driver has a confirmed violation without fine
        for fine in Fine.objects.filter(violation__isnull=True)[:50]:
            cand = TrafficViolation.objects.filter(
                driver__user=fine.driver,
                fine__isnull=True,
            ).first()
            if cand and not Fine.objects.filter(violation=cand).exists():
                fine.violation = cand
                fine.save(update_fields=['violation'])
                fixed += 1
                continue
            # Backfill a confirmed violation so Fine↔Violation modules stay matched
            driver_profile = Driver.objects.filter(user=fine.driver).first()
            if not driver_profile:
                continue
            from django.utils import timezone as dj_tz
            cand = TrafficViolation.objects.create(
                driver=driver_profile,
                violation_type='NO_PARKING',
                observed_action='parking',
                violation_date=dj_tz.now(),
                location=fine.location or 'Phnom Penh',
                description='Backfilled to match orphan fine record',
                plate_detected=fine.vehicle_plate or '',
                status='confirmed',
            )
            fine.violation = cand
            fine.save(update_fields=['violation'])
            fixed += 1

        self.stdout.write(self.style.SUCCESS(f'  Orphan FK repairs: {fixed}'))

    def _print_summary(self, counts: dict, *, private: bool) -> None:
        from django.db.models import Q

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('PDF seed load complete — module counts:'))
        for k, v in counts.items():
            self.stdout.write(f'  {k}: {v}')
        if private:
            orphan_v = TrafficViolation.objects.filter(
                Q(officer__isnull=True) | Q(camera__isnull=True) | Q(road__isnull=True)
            ).count()
            self.stdout.write(f'  violations still missing officer/camera/road: {orphan_v}')
