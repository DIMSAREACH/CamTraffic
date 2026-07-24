"""Seed production-ready government-scale dashboard data for CamTraffic."""
from __future__ import annotations

import io
import random
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from ai_detection.models import AIDetectionLog
from appeals.models import ViolationAppeal
from audit.models import AuditLog
from fines.models import Fine
from infrastructure.models import Camera
from notifications.models import Notification
from users.models import Driver, Officer
from vehicles.models import Vehicle
from violations.models import TrafficViolation, ViolationRule

User = get_user_model()

# Unique Cambodian enforcement types (no duplicates on Top Violations chart)
VIOLATION_CATALOG = [
    ('ILLEGAL_LEFT_TURN', 'Illegal Left Turn', 18),
    ('ILLEGAL_RIGHT_TURN', 'Illegal Right Turn', 12),
    ('ILLEGAL_U_TURN', 'Illegal U-Turn', 14),
    ('NO_PARKING', 'No Parking', 16),
    ('NO_STOPPING', 'No Stopping', 10),
    ('ROAD_CLOSED', 'Road Closed', 8),
    ('WEIGHT_LIMIT_VIOLATION', 'Weight Limit Exceeded', 6),
    ('SPEEDING', 'Speeding', 22),
    ('NO_ENTRY', 'No Entry', 15),
    ('RED_LIGHT', 'Running Red Light', 11),
    ('NO_HELMET', 'No Helmet (Motorcycle)', 13),
    ('WRONG_WAY', 'Wrong-Way Driving', 7),
]

FINE_AMOUNTS_USD = [8, 10, 12, 15, 20, 25, 30, 40, 50]  # UI shows KHR (×4100)

PP_LOCATIONS = [
    'Monivong Blvd, Chamkarmon, Phnom Penh',
    'Norodom Blvd, Daun Penh, Phnom Penh',
    'Russian Blvd, Tuol Kork, Phnom Penh',
    'Mao Tse Tung Blvd, Boeng Keng Kang, Phnom Penh',
    'Sihanouk Blvd, Independence Monument, Phnom Penh',
    'Kampuchea Krom Blvd, 7 Makara, Phnom Penh',
    'Sisowath Quay, Riverside, Phnom Penh',
    'Street 271, Toul Tom Poung, Phnom Penh',
    'Veng Sreng Blvd, Mean Chey, Phnom Penh',
    'Charles de Gaulle Blvd, Olympic Stadium, Phnom Penh',
    'Samdech Pan Avenue, BKK1, Phnom Penh',
    'Koh Pich Boulevard, Diamond Island, Phnom Penh',
    'Chbar Ampov Bridge Approach, Phnom Penh',
    'Chaom Chau Roundabout, National Road 4',
    'National Road 1, Kien Svay Interchange',
    'National Road 6, Ta Khmau, Kandal',
    'Siem Reap, Sivatha Blvd',
    'Siem Reap Airport Road (NR6 Approach)',
    'Battambang, Street 1 City Center',
    'Sihanoukville, Ekareach Street',
    'Sihanoukville, NR4 Gateway',
]

KH_FIRST = [
    'Sokha', 'Dara', 'Sophea', 'Vannak', 'Chenda', 'Rithy', 'Pisey', 'Bopha',
    'Makara', 'Srey', 'Nita', 'Vichea', 'Pheak', 'Sothea', 'Kanha', 'Rotha',
    'Sopheak', 'Dalin', 'Ravy', 'Sokun', 'Thida', 'Vuthy', 'Sreymom', 'Panha',
]
KH_LAST = [
    'Sok', 'Chan', 'Kim', 'Chea', 'Hun', 'Lim', 'Meas', 'Pich',
    'Phan', 'Ouk', 'Touch', 'San', 'Keo', 'Nhem', 'Prak', 'Yim',
    'Ly', 'Heng', 'Chhorn', 'Seng', 'Ou', 'Thach', 'Ear', 'Chhim',
]

VEHICLE_MODELS = [
    ('car', ['Toyota Camry', 'Toyota Vios', 'Honda Civic', 'Mazda 2', 'Hyundai Accent', 'Kia Morning', 'Toyota Fortuner', 'Honda CR-V']),
    ('motorcycle', ['Honda Dream', 'Honda Wave', 'Yamaha Exciter', 'Suzuki Raider', 'Yamaha Nouvo', 'Honda Scoopy']),
    ('tuk-tuk', ['Remorque Tuk-Tuk', 'Electric Tuk-Tuk', 'Classic Remork']),
    ('truck', ['Hyundai Mighty', 'Isuzu NPR', 'Hino 300']),
    ('bus', ['Hyundai County', 'Isuzu Journey', 'City Minibus']),
]

SIGN_NAMES = [
    'Stop Sign', 'No Entry', 'Speed Limit 40', 'Speed Limit 60', 'Speed Limit 80',
    'Yield', 'No Parking', 'One Way', 'Pedestrian Crossing', 'No U-Turn',
    'No Left Turn', 'No Right Turn', 'Road Closed', 'Weight Limit',
]

NOTIFICATION_TEMPLATES = [
    ('fine', 'Traffic fine issued', 'A traffic fine of ${amount} was issued for {reason} at {location}.'),
    ('fine', 'Fine payment reminder', 'Your fine for {reason} is due. Please pay via ABA / Wing / ACLEDA.'),
    ('violation', 'Violation under review', 'AI flagged {reason} near {location}. An officer will confirm shortly.'),
    ('violation', 'Violation confirmed', 'Your {reason} case at {location} was confirmed by traffic police.'),
    ('appeal', 'Appeal received', 'Your appeal for {reason} was submitted and is pending review.'),
    ('appeal', 'Appeal decision', 'Your appeal regarding {reason} has been updated. Open Appeals to view the result.'),
    ('payment', 'Payment confirmed', 'Payment received for fine related to {reason}. Receipt is available in My Fines.'),
    ('detection', 'AI detection logged', 'Camera network logged a high-confidence detection near {location}.'),
    ('alert', 'Hotspot advisory', 'Elevated enforcement activity reported at {location}. Drive carefully.'),
    ('system', 'CamTraffic operations notice', 'Phnom Penh traffic enforcement dashboard data refreshed for duty officers.'),
]

AUDIT_RESOURCES = [
    ('users', ['create', 'update', 'login']),
    ('fines', ['create', 'update']),
    ('violations', ['create', 'update']),
    ('cameras', ['update', 'create']),
    ('appeals', ['update', 'create']),
    ('vehicles', ['create', 'update']),
    ('notifications', ['create']),
]


class Command(BaseCommand):
    help = (
        'Prepare government-scale production data: accounts, signs, cameras, '
        'vehicles, violations, fines, appeals, AI detections, notifications, and audit logs.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset-passwords',
            action='store_true',
            help='Reset demo account passwords to the default from seed_demo',
        )
        parser.add_argument(
            '--skip-cameras',
            action='store_true',
            help='Do not seed camera/road demo feeds',
        )
        parser.add_argument(
            '--count',
            type=int,
            default=450,
            help='Base volume for enforcement records (default: 450 — government demo scale)',
        )
        parser.add_argument(
            '--drivers',
            type=int,
            default=160,
            help='Number of driver accounts to ensure (default: 160)',
        )
        parser.add_argument(
            '--officers',
            type=int,
            default=32,
            help='Number of officer accounts to ensure (default: 32)',
        )
        parser.add_argument(
            '--import-signs',
            action='store_true',
            default=True,
            help='Import full Cambodia traffic-sign catalog if available (default: on)',
        )
        parser.add_argument(
            '--skip-signs',
            action='store_true',
            help='Skip Cambodia traffic-sign catalog import',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('CamTraffic — Government Production Data Seed'))

        call_command('seed_demo', reset_passwords=options['reset_passwords'])
        call_command('backfill_erd_alignment')
        call_command('seed_violation_rules')
        self._ensure_extra_violation_rules()

        if options['import_signs'] and not options['skip_signs']:
            try:
                call_command('import_cambodia_signs')
            except Exception as exc:
                self.stdout.write(self.style.WARNING(f'  Sign import skipped: {exc}'))

        if not options['skip_cameras']:
            call_command('seed_cameras', force=True)
        elif Camera.objects.count() == 0:
            self.stdout.write(self.style.WARNING('  No cameras — run: python manage.py seed_cameras --force'))
        else:
            self.stdout.write(self.style.SUCCESS(f'  Cameras: {Camera.objects.count()}'))

        police_officers = self._ensure_officers(options['officers'])
        drivers = self._ensure_drivers(options['drivers'])

        if not police_officers or not drivers:
            self.stdout.write(self.style.WARNING('  Need at least 1 police and 1 driver account'))
            return

        count = max(50, options['count'])
        self._seed_production_data(police_officers, drivers, count)

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Government-scale seed complete'))
        self.stdout.write('  Frontends: VITE_USE_MOCK=false, VITE_USE_SAMPLE_FALLBACK=false')
        self.stdout.write('  Refresh Admin Dashboard to see updated KPIs and charts')
        self.stdout.write(
            f'  Volume: ~{count} enforcement records · {len(drivers)} drivers · '
            f'{len(police_officers)} officers · {Camera.objects.count()} cameras'
        )

    def _ensure_extra_violation_rules(self):
        """Ensure SPEEDING / RED_LIGHT / etc. exist for charts + expert rules."""
        extras = [
            ('speed_limit', 'speeding', 'SPEEDING', 'Speeding', 25, 2, 'Land Traffic Law — Schedule (speed)'),
            ('no_entry', 'enter', 'NO_ENTRY', 'No Entry', 20, 2, 'Land Traffic Law — Prohibitory signs'),
            ('traffic_light', 'run_red', 'RED_LIGHT', 'Running Red Light', 40, 3, 'Land Traffic Law — Signals'),
            ('helmet', 'no_helmet', 'NO_HELMET', 'No Helmet (Motorcycle)', 10, 1, 'Land Traffic Law — Safety'),
            ('one_way', 'wrong_way', 'WRONG_WAY', 'Wrong-Way Driving', 30, 3, 'Land Traffic Law — Direction'),
        ]
        created = 0
        for sign_key, action, vtype, title, amount, points, legal in extras:
            _, was_created = ViolationRule.objects.get_or_create(
                sign_class_key=sign_key,
                prohibited_action=action,
                defaults={
                    'violation_type': vtype,
                    'title': title,
                    'description': f'Cambodia traffic enforcement rule: {title}',
                    'default_fine_amount': Decimal(str(amount)),
                    'demerit_points': points,
                    'legal_reference': legal,
                    'is_active': True,
                },
            )
            if was_created:
                created += 1
        if created:
            self.stdout.write(self.style.SUCCESS(f'  Extra violation rules: {created}'))

    def _ensure_officers(self, target: int) -> list:
        from infrastructure.models import PoliceStation

        station = PoliceStation.objects.filter(code='PP-HQ').first() or PoliceStation.objects.first()
        existing = list(User.objects.filter(role='police', is_active=True))
        need = max(0, target - len(existing))
        created = 0
        for i in range(need):
            n = len(existing) + i + 1
            email = f'officer{n:03d}@camtraffic.demo'
            if User.objects.filter(email=email).exists():
                continue
            user = User.objects.create_user(
                email=email,
                password='CamTraffic@2026!',
                full_name=f'{random.choice(KH_FIRST)} {random.choice(KH_LAST)}',
                role='police',
                is_active=True,
                email_verified=True,
            )
            Officer.objects.get_or_create(
                user=user,
                defaults={
                    'badge_no': f'OFF-{n:03d}',
                    'rank': random.choice(['Traffic Officer', 'Senior Officer', 'Sergeant', 'Lieutenant']),
                    'department': 'Traffic Enforcement',
                    'station': station,
                    'status': 'active',
                },
            )
            existing.append(user)
            created += 1
        if created:
            self.stdout.write(self.style.SUCCESS(f'  Officers created: {created}'))
        self.stdout.write(self.style.SUCCESS(f'  Officers total: {User.objects.filter(role="police").count()}'))
        return list(User.objects.filter(role='police', is_active=True))

    def _ensure_drivers(self, target: int) -> list:
        existing = list(User.objects.filter(role='driver', is_active=True))
        need = max(0, target - len(existing))
        created = 0
        for i in range(need):
            n = len(existing) + i + 1
            email = f'driver{n:03d}@camtraffic.demo'
            if User.objects.filter(email=email).exists():
                continue
            user = User.objects.create_user(
                email=email,
                password='CamTraffic@2026!',
                full_name=f'{random.choice(KH_FIRST)} {random.choice(KH_LAST)}',
                role='driver',
                is_active=True,
                email_verified=True,
                phone=f'+8551{random.randint(10000000, 99999999)}',
                address=random.choice(PP_LOCATIONS[:12]),
            )
            Driver.objects.get_or_create(
                user=user,
                defaults={
                    'license_no': f'DL-KH-2026-{n:05d}',
                    'license_expiry': date.today() + timedelta(days=365 * random.randint(1, 4)),
                    'kyc_status': 'approved',
                    'status': 'active',
                },
            )
            existing.append(user)
            created += 1
        if created:
            self.stdout.write(self.style.SUCCESS(f'  Drivers created: {created}'))
        self.stdout.write(self.style.SUCCESS(f'  Drivers total: {User.objects.filter(role="driver").count()}'))
        return list(User.objects.filter(role='driver', is_active=True))

    def _backdate(self, model, pk, field: str, when):
        model.objects.filter(pk=pk).update(**{field: when})

    def _weighted_violation(self):
        types, titles, weights = zip(*VIOLATION_CATALOG)
        idx = random.choices(range(len(types)), weights=weights, k=1)[0]
        return types[idx], titles[idx]

    def _growth_day_offset(self, span_days: int = 180) -> int:
        """Bias toward recent months so charts show an upward government ops trend."""
        return int((1 - random.random() ** 1.7) * span_days)

    def _pick_camera(self, cameras: list[Camera]) -> Camera | None:
        if not cameras:
            return None
        active = [c for c in cameras if c.status == 'active']
        pool = active or cameras
        return random.choice(pool)

    @transaction.atomic
    def _seed_production_data(self, police_officers, drivers, count):
        rules = list(ViolationRule.objects.all())
        rule_by_type = {r.violation_type: r for r in rules}
        cameras = list(Camera.objects.select_related('road').all())
        officer_profiles = {
            o.user_id: o for o in Officer.objects.filter(user__in=police_officers).select_related('user')
        }

        # --- Vehicles ---
        self.stdout.write(self.style.HTTP_INFO('\nSeeding Vehicles...'))
        vehicles_created = 0
        provinces = ['1A', '2A', '3A', '4A', '5A', 'PP', 'SR', 'BT', 'SHV', 'KD']
        for driver in drivers:
            existing_n = Vehicle.objects.filter(owner=driver).count()
            for _ in range(max(0, random.randint(1, 2) - existing_n)):
                v_type, models = random.choice(VEHICLE_MODELS)
                plate = f'{random.choice(provinces)}-{random.randint(1000, 9999)}'
                if Vehicle.objects.filter(plate_number=plate).exists():
                    plate = f'{random.choice(provinces)}-{random.randint(10000, 99999)}'
                _, created = Vehicle.objects.get_or_create(
                    plate_number=plate,
                    defaults={
                        'owner': driver,
                        'vehicle_type': v_type,
                        'model': random.choice(models),
                        'color': random.choice(['White', 'Black', 'Silver', 'Red', 'Blue', 'Gray', 'Green']),
                        'year': random.randint(2014, 2025),
                        'status': 'active',
                    },
                )
                if created:
                    vehicles_created += 1
        self.stdout.write(self.style.SUCCESS(f'  Vehicles created: {vehicles_created} · total {Vehicle.objects.count()}'))

        vehicles = list(Vehicle.objects.select_related('owner').all())
        driver_profiles = list(Driver.objects.filter(user__in=drivers, user__is_active=True))

        # --- Violations (camera-linked, dated across 6 months) ---
        self.stdout.write(self.style.HTTP_INFO('\nSeeding Violations...'))
        violations_created = 0
        created_violations: list[TrafficViolation] = []
        if driver_profiles and vehicles:
            for _ in range(count):
                vtype, title = self._weighted_violation()
                rule = rule_by_type.get(vtype)
                driver_profile = random.choice(driver_profiles)
                vehicle_obj = (
                    Vehicle.objects.filter(owner=driver_profile.user).first()
                    or random.choice(vehicles)
                )
                camera = self._pick_camera(cameras) if random.random() < 0.78 else None
                location = (
                    f'{camera.street or camera.name}, {camera.district or camera.province}'.strip(', ')
                    if camera
                    else random.choice(PP_LOCATIONS)
                )
                when = timezone.now() - timedelta(days=self._growth_day_offset(180), hours=random.randint(0, 23))
                status = random.choices(
                    ['pending_review', 'confirmed', 'rejected'],
                    weights=[20, 70, 10],
                    k=1,
                )[0]
                officer_profile = officer_profiles.get(random.choice(police_officers).id)
                violation = TrafficViolation.objects.create(
                    driver=driver_profile,
                    vehicle=vehicle_obj,
                    officer=officer_profile if status != 'pending_review' and random.random() < 0.7 else None,
                    camera=camera,
                    road=camera.road if camera else None,
                    violation_type=vtype,
                    detected_class_key=rule.sign_class_key if rule else vtype,
                    detected_sign_code=f'R{random.randint(1, 3)}-{random.randint(1, 40):02d}',
                    observed_action=rule.prohibited_action if rule else vtype,
                    location=location,
                    status=status,
                    description=f'AI-assisted detection: {title}',
                    violation_date=when,
                    plate_detected=vehicle_obj.plate_number if vehicle_obj else '',
                )
                self._backdate(TrafficViolation, violation.pk, 'created_at', when)
                created_violations.append(violation)
                violations_created += 1
        self.stdout.write(self.style.SUCCESS(
            f'  Violations created: {violations_created} · total {TrafficViolation.objects.count()}'
        ))

        # --- Fines (linked to confirmed violations when possible) ---
        self.stdout.write(self.style.HTTP_INFO('\nSeeding Fines...'))
        fines_created = 0
        confirmed_without_fine = [v for v in created_violations if v.status == 'confirmed']
        random.shuffle(confirmed_without_fine)
        link_pool = confirmed_without_fine[: int(count * 0.65)]

        for i in range(count):
            linked = link_pool[i] if i < len(link_pool) else None
            if linked:
                driver = linked.driver.user
                vehicle_plate = linked.plate_detected or (linked.vehicle.plate_number if linked.vehicle else '')
                location = linked.location
                title = next(
                    (t for vt, t, _w in VIOLATION_CATALOG if vt == linked.violation_type),
                    linked.violation_type.replace('_', ' ').title(),
                )
                when = linked.created_at
            else:
                driver = random.choice(drivers)
                vehicle = random.choice(vehicles)
                vehicle_plate = vehicle.plate_number
                location = random.choice(PP_LOCATIONS)
                _vtype, title = self._weighted_violation()
                when = timezone.now() - timedelta(days=self._growth_day_offset(180), hours=random.randint(0, 23))
                linked = None

            police = random.choice(police_officers)
            status = random.choices(
                ['pending', 'paid', 'overdue', 'dismissed', 'disputed'],
                weights=[24, 52, 12, 6, 6],
                k=1,
            )[0]
            amount = Decimal(str(random.choice(FINE_AMOUNTS_USD)))
            fine_kwargs = {
                'driver': driver,
                'police': police,
                'vehicle_plate': vehicle_plate,
                'reason': title,
                'amount': amount,
                'location': location,
                'status': status,
                'due_date': (when + timedelta(days=14)).date() if when else date.today() + timedelta(days=14),
            }
            if linked and not Fine.objects.filter(violation=linked).exists():
                fine_kwargs['violation'] = linked
            if status == 'paid':
                fine_kwargs['paid_at'] = when + timedelta(days=random.randint(1, 10))
                fine_kwargs['payment_method'] = random.choice(['ABA', 'Wing', 'ACLEDA', 'Cash'])
                fine_kwargs['payment_reference'] = f'KH-{random.randint(100000, 999999)}'
            fine = Fine.objects.create(**fine_kwargs)
            self._backdate(Fine, fine.pk, 'created_at', when)
            fines_created += 1
        self.stdout.write(self.style.SUCCESS(f'  Fines created: {fines_created} · total {Fine.objects.count()}'))

        # --- Appeals ---
        self.stdout.write(self.style.HTTP_INFO('\nSeeding Appeals...'))
        appeals_created = 0
        appeal_reasons = [
            'I was not driving the vehicle at the time',
            'The traffic sign was not clearly visible',
            'Emergency situation required the manoeuvre',
            'Incorrect license plate OCR detection',
            'Sign was temporarily covered / under maintenance',
            'GPS location does not match the camera zone',
            'Vehicle plate was cloned / misread by OCR',
        ]
        confirmed = list(
            TrafficViolation.objects.filter(status='confirmed').order_by('-created_at')[: max(40, count // 2)]
        )
        for violation in confirmed:
            if random.random() > 0.42:
                continue
            when = timezone.now() - timedelta(days=random.randint(1, 60))
            ViolationAppeal.objects.create(
                violation=violation,
                driver=violation.driver,
                reason=random.choice(appeal_reasons),
                status=random.choice(['pending', 'upheld', 'dismissed']),
                submitted_at=when,
            )
            appeals_created += 1
        self.stdout.write(self.style.SUCCESS(f'  Appeals created: {appeals_created}'))

        # --- AI detections ---
        self.stdout.write(self.style.HTTP_INFO('\nSeeding AI Detection Logs...'))
        detections_created = 0
        try:
            from PIL import Image
        except ImportError:
            Image = None

        detection_target = max(count, int(count * 2.2))
        for i in range(detection_target):
            user = random.choice(police_officers)
            sign = random.choice(SIGN_NAMES)
            when = timezone.now() - timedelta(days=self._growth_day_offset(180), hours=random.randint(0, 23))
            uploaded = None
            if Image is not None and i % 4 == 0:
                img = Image.new(
                    'RGB',
                    (640, 480),
                    color=(random.randint(80, 180), random.randint(80, 180), random.randint(80, 180)),
                )
                buf = io.BytesIO()
                img.save(buf, format='JPEG')
                buf.seek(0)
                uploaded = SimpleUploadedFile(
                    f'detection_{timezone.now().timestamp():.0f}_{i}.jpg',
                    buf.read(),
                    content_type='image/jpeg',
                )
            detection = AIDetectionLog.objects.create(
                user=user,
                uploaded_image=uploaded,
                detected_sign=sign,
                confidence=round(random.uniform(88.0, 99.2), 1),
                description=f'AI detected: {sign}',
                guidance='Follow posted traffic sign instructions',
                processing_time=round(random.uniform(0.35, 2.1), 2),
                detected_plate=(
                    f'{random.choice(["1A", "2A", "PP", "SR"])}-{random.randint(1000, 9999)}'
                    if random.random() > 0.35
                    else ''
                ),
                plate_confidence=round(random.uniform(75.0, 96.0), 1) if random.random() > 0.35 else 0.0,
                vehicle_count=random.randint(0, 6),
            )
            self._backdate(AIDetectionLog, detection.pk, 'created_at', when)
            detections_created += 1
        self.stdout.write(self.style.SUCCESS(
            f'  AI detections created: {detections_created} · total {AIDetectionLog.objects.count()}'
        ))

        # --- Notifications ---
        self.stdout.write(self.style.HTTP_INFO('\nSeeding Notifications...'))
        notif_created = self._seed_notifications(drivers, police_officers, count)
        self.stdout.write(self.style.SUCCESS(
            f'  Notifications created: {notif_created} · total {Notification.objects.count()}'
        ))

        # --- Audit logs ---
        self.stdout.write(self.style.HTTP_INFO('\nSeeding Audit Logs...'))
        audit_created = self._seed_audit_logs(police_officers, count)
        self.stdout.write(self.style.SUCCESS(
            f'  Audit logs created: {audit_created} · total {AuditLog.objects.count()}'
        ))

        # Refresh camera daily counters for live ops look
        for cam in cameras:
            if cam.status == 'active':
                cam.detection_count_today = random.randint(12, 72)
                cam.last_ping = timezone.now() - timedelta(minutes=random.randint(1, 40))
                cam.save(update_fields=['detection_count_today', 'last_ping'])

    def _seed_notifications(self, drivers, police_officers, count: int) -> int:
        created = 0
        admin_users = list(User.objects.filter(role='admin', is_active=True))
        recipients = drivers + police_officers + admin_users
        target = max(120, int(count * 0.55))
        for _ in range(target):
            ntype, title, body_tpl = random.choice(NOTIFICATION_TEMPLATES)
            location = random.choice(PP_LOCATIONS)
            reason = random.choice([t for _vt, t, _w in VIOLATION_CATALOG])
            amount = random.choice(FINE_AMOUNTS_USD)
            user = random.choice(recipients)
            when = timezone.now() - timedelta(days=self._growth_day_offset(90), hours=random.randint(0, 23))
            is_read = random.random() < 0.45
            notif = Notification.objects.create(
                user=user,
                title=title,
                message=body_tpl.format(amount=amount, reason=reason, location=location),
                type=ntype,
                is_read=is_read,
                read_at=when + timedelta(hours=random.randint(1, 12)) if is_read else None,
                link_url=random.choice([
                    '/admin/fines',
                    '/admin/violations',
                    '/admin/appeals',
                    '/admin/cameras',
                    '/admin/ai-detection',
                    '',
                ]),
            )
            self._backdate(Notification, notif.pk, 'created_at', when)
            created += 1
        return created

    def _seed_audit_logs(self, police_officers, count: int) -> int:
        created = 0
        actors = list(User.objects.filter(role__in=['admin', 'police'], is_active=True)) or police_officers
        target = max(180, int(count * 0.7))
        ips = [f'203.189.{random.randint(1, 254)}.{random.randint(1, 254)}' for _ in range(12)]
        for _ in range(target):
            resource, actions = random.choice(AUDIT_RESOURCES)
            action = random.choice(actions)
            when = timezone.now() - timedelta(days=self._growth_day_offset(120), hours=random.randint(0, 23))
            log = AuditLog.objects.create(
                user=random.choice(actors),
                action=action,
                resource=resource,
                resource_id=str(random.randint(1000, 99999)),
                ip_address=random.choice(ips),
                old_value={'status': 'pending'} if action == 'update' else {},
                new_value={'status': random.choice(['confirmed', 'paid', 'active'])} if action != 'login' else {},
                extra_data={'source': 'seed_production', 'portal': 'admin'},
            )
            AuditLog.objects.filter(pk=log.pk).update(timestamp=when)
            created += 1
        return created
