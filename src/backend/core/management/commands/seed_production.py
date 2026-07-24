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
from fines.models import Fine
from infrastructure.models import Camera, PoliceStation
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
    'National Road 1, Kien Svay Interchange',
    'National Road 4, Chaom Chau Roundabout',
    'Siem Reap, Sivatha Blvd',
    'Battambang, Street 1 City Center',
    'Sihanoukville, Ekareach Street',
]

KH_FIRST = [
    'Sokha', 'Dara', 'Sophea', 'Vannak', 'Chenda', 'Rithy', 'Pisey', 'Bopha',
    'Makara', 'Srey', 'Nita', 'Vichea', 'Pheak', 'Sothea', 'Kanha', 'Rotha',
]
KH_LAST = [
    'Sok', 'Chan', 'Kim', 'Chea', 'Hun', 'Lim', 'Meas', 'Pich',
    'Phan', 'Ouk', 'Touch', 'San', 'Keo', 'Nhem', 'Prak', 'Yim',
]

VEHICLE_MODELS = [
    ('car', ['Toyota Camry', 'Toyota Vios', 'Honda Civic', 'Mazda 2', 'Hyundai Accent', 'Kia Morning']),
    ('motorcycle', ['Honda Dream', 'Honda Wave', 'Yamaha Exciter', 'Suzuki Raider', 'Yamaha Nouvo']),
    ('suv', ['Toyota Fortuner', 'Ford Everest', 'Mitsubishi Pajero', 'Honda CR-V']),
    ('truck', ['Hyundai Mighty', 'Isuzu NPR', 'Hino 300']),
]

SIGN_NAMES = [
    'Stop Sign', 'No Entry', 'Speed Limit 40', 'Speed Limit 60', 'Speed Limit 80',
    'Yield', 'No Parking', 'One Way', 'Pedestrian Crossing', 'No U-Turn',
    'No Left Turn', 'No Right Turn', 'Road Closed', 'Weight Limit',
]


class Command(BaseCommand):
    help = (
        'Prepare government-scale production data: accounts, signs, cameras, '
        'vehicles, violations, fines, appeals, and AI detections for a clean admin dashboard.'
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
            default=220,
            help='Base volume for enforcement records (default: 220 — government demo scale)',
        )
        parser.add_argument(
            '--drivers',
            type=int,
            default=80,
            help='Number of driver accounts to ensure (default: 80)',
        )
        parser.add_argument(
            '--officers',
            type=int,
            default=18,
            help='Number of officer accounts to ensure (default: 18)',
        )
        parser.add_argument(
            '--import-signs',
            action='store_true',
            help='Import full Cambodia traffic-sign catalog if available',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('CamTraffic — Government Production Data Seed'))

        call_command('seed_demo', reset_passwords=options['reset_passwords'])
        call_command('backfill_erd_alignment')
        call_command('seed_violation_rules')

        if options['import_signs']:
            try:
                call_command('import_cambodia_signs')
            except Exception as exc:
                self.stdout.write(self.style.WARNING(f'  Sign import skipped: {exc}'))

        if not options['skip_cameras'] and Camera.objects.count() == 0:
            call_command('seed_cameras')
        elif Camera.objects.count() == 0:
            self.stdout.write(self.style.WARNING('  No cameras — run: python manage.py seed_cameras'))
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
        self.stdout.write(f'  Volume: ~{count} enforcement records · {len(drivers)} drivers · {len(police_officers)} officers')

    def _ensure_officers(self, target: int) -> list:
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
                    'rank': random.choice(['Traffic Officer', 'Senior Officer', 'Sergeant']),
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
                address=random.choice(PP_LOCATIONS[:8]),
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
        # Beta-like: more weight on recent days
        return int((1 - random.random() ** 1.7) * span_days)

    @transaction.atomic
    def _seed_production_data(self, police_officers, drivers, count):
        rules = list(ViolationRule.objects.all())
        rule_by_type = {r.violation_type: r for r in rules}

        # --- Vehicles ---
        self.stdout.write(self.style.HTTP_INFO('\nSeeding Vehicles...'))
        vehicles_created = 0
        provinces = ['1A', '2A', '3A', '4A', '5A', 'PP', 'SR', 'BT']
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
                    },
                )
                if created:
                    vehicles_created += 1
        self.stdout.write(self.style.SUCCESS(f'  Vehicles created: {vehicles_created} · total {Vehicle.objects.count()}'))

        vehicles = list(Vehicle.objects.select_related('owner').all())
        driver_profiles = list(Driver.objects.filter(user__in=drivers, user__is_active=True))

        # --- Violations (unique types, dated across 6 months) ---
        self.stdout.write(self.style.HTTP_INFO('\nSeeding Violations...'))
        violations_created = 0
        target_violations = count
        if driver_profiles and vehicles:
            for _ in range(target_violations):
                vtype, title = self._weighted_violation()
                rule = rule_by_type.get(vtype)
                driver_profile = random.choice(driver_profiles)
                vehicle_obj = (
                    Vehicle.objects.filter(owner=driver_profile.user).first()
                    or random.choice(vehicles)
                )
                when = timezone.now() - timedelta(days=self._growth_day_offset(180), hours=random.randint(0, 23))
                status = random.choices(
                    ['pending_review', 'confirmed', 'rejected'],
                    weights=[22, 68, 10],
                    k=1,
                )[0]
                violation = TrafficViolation.objects.create(
                    driver=driver_profile,
                    vehicle=vehicle_obj,
                    violation_type=vtype,
                    detected_class_key=rule.sign_class_key if rule else vtype,
                    detected_sign_code=f'R{random.randint(1, 3)}-{random.randint(1, 40):02d}',
                    observed_action=rule.prohibited_action if rule else vtype,
                    location=random.choice(PP_LOCATIONS),
                    status=status,
                    description=f'AI-assisted detection: {title}',
                    violation_date=when,
                    plate_detected=vehicle_obj.plate_number if vehicle_obj else '',
                )
                self._backdate(TrafficViolation, violation.pk, 'created_at', when)
                violations_created += 1
        self.stdout.write(self.style.SUCCESS(
            f'  Violations created: {violations_created} · total {TrafficViolation.objects.count()}'
        ))

        # --- Fines ---
        self.stdout.write(self.style.HTTP_INFO('\nSeeding Fines...'))
        fines_created = 0
        for _ in range(count):
            driver = random.choice(drivers)
            police = random.choice(police_officers)
            vehicle = random.choice(vehicles)
            vtype, title = self._weighted_violation()
            when = timezone.now() - timedelta(days=self._growth_day_offset(180), hours=random.randint(0, 23))
            status = random.choices(
                ['pending', 'paid', 'overdue', 'dismissed'],
                weights=[28, 55, 12, 5],
                k=1,
            )[0]
            fine = Fine.objects.create(
                driver=driver,
                police=police,
                vehicle_plate=vehicle.plate_number,
                reason=title,
                amount=Decimal(str(random.choice(FINE_AMOUNTS_USD))),
                location=random.choice(PP_LOCATIONS),
                status=status,
            )
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
        ]
        confirmed = list(TrafficViolation.objects.filter(status='confirmed').order_by('-created_at')[: count // 2])
        for violation in confirmed:
            if random.random() > 0.55:
                continue
            when = timezone.now() - timedelta(days=random.randint(1, 60))
            appeal = ViolationAppeal.objects.create(
                violation=violation,
                driver=violation.driver,
                reason=random.choice(appeal_reasons),
                status=random.choice(['pending', 'upheld', 'dismissed']),
                submitted_at=when,
            )
            appeals_created += 1
            _ = appeal
        self.stdout.write(self.style.SUCCESS(f'  Appeals created: {appeals_created}'))

        # --- AI detections ---
        self.stdout.write(self.style.HTTP_INFO('\nSeeding AI Detection Logs...'))
        detections_created = 0
        try:
            from PIL import Image
        except ImportError:
            Image = None

        detection_target = max(count, int(count * 1.4))
        for i in range(detection_target):
            user = random.choice(police_officers)
            sign = random.choice(SIGN_NAMES)
            when = timezone.now() - timedelta(days=self._growth_day_offset(180), hours=random.randint(0, 23))
            uploaded = None
            if Image is not None:
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
                    f'{random.choice(["1A", "2A", "PP"])}-{random.randint(1000, 9999)}'
                    if random.random() > 0.35
                    else ''
                ),
                plate_confidence=round(random.uniform(75.0, 96.0), 1) if random.random() > 0.35 else 0.0,
                vehicle_count=random.randint(0, 4),
            )
            self._backdate(AIDetectionLog, detection.pk, 'created_at', when)
            detections_created += 1
        self.stdout.write(self.style.SUCCESS(
            f'  AI detections created: {detections_created} · total {AIDetectionLog.objects.count()}'
        ))
