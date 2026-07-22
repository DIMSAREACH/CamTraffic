"""Seed demo accounts + reference data for local dev, E2E, and defense demos."""
from datetime import date, timedelta
from decimal import Decimal
import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from infrastructure.models import PoliceStation, Road
from users.models import Driver, Officer

User = get_user_model()

DEMO_PASSWORD = 'CamTraffic@2026!'

ACCOUNTS = [
    {
        'email': 'admin@camtraffic.demo',
        'full_name': 'System Administrator',
        'role': 'admin',
        'is_staff': True,
        'is_superuser': True,
        'license_no': '',
    },
    {
        'email': 'officer@camtraffic.demo',
        'full_name': 'Dara Chan',
        'role': 'police',
        'is_staff': False,
        'is_superuser': False,
        'license_no': '',
        'badge_no': 'OFF-001',
        'rank': 'Traffic Officer',
    },
    {
        'email': 'driver@camtraffic.demo',
        'full_name': 'Kosal Pich',
        'role': 'driver',
        'is_staff': False,
        'is_superuser': False,
        'license_no': 'DL-KH-2024-001234',
        'driver_license': 'DL-KH-2024-001234',
    },
    {
        'email': 'driver2@camtraffic.demo',
        'full_name': 'Vanna Sok',
        'role': 'driver',
        'is_staff': False,
        'is_superuser': False,
        'license_no': 'DL-KH-2024-002345',
        'driver_license': 'DL-KH-2024-002345',
    },
]


class Command(BaseCommand):
    help = 'Create demo admin/officer/driver accounts and seed reference data (dev & defense demo)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset-passwords',
            action='store_true',
            help='Reset demo account passwords to the default demo password',
        )
        parser.add_argument(
            '--accounts-only',
            action='store_true',
            help='Only sync demo login accounts (skip seed_data — for hosted API boot)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Allow seeding when DEBUG=False (requires ALLOW_DEMO_SEED=true as well)',
        )

    def _assert_demo_seed_allowed(self, *, force: bool) -> None:
        """Block known demo passwords on real production unless explicitly opted in."""
        allow = os.getenv('ALLOW_DEMO_SEED', '').lower() in ('1', 'true', 'yes')
        if settings.DEBUG:
            return
        if allow and force:
            self.stdout.write(self.style.WARNING(
                'ALLOW_DEMO_SEED=true — seeding demo accounts on a non-DEBUG environment.',
            ))
            return
        raise CommandError(
            'Refusing seed_demo when DEBUG=False. '
            'Demo accounts use a public password and must not run on production. '
            'For local/defense only: set DEBUG=True, or set ALLOW_DEMO_SEED=true and pass --force. '
            'Production admins: use bootstrap_admin_env instead.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        reset_passwords = options['reset_passwords']
        accounts_only = options['accounts_only']
        force = options['force']
        self._assert_demo_seed_allowed(force=force)
        self.stdout.write('Seeding CamTraffic demo environment...')

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

        Road.objects.get_or_create(
            name='Monivong Blvd — Chamkarmon',
            defaults={
                'road_type': 'urban',
                'speed_limit': 40,
                'city': 'Phnom Penh',
                'region': 'Chamkarmon',
                'status': 'active',
            },
        )

        for spec in ACCOUNTS:
            user, created = User.objects.get_or_create(
                email=spec['email'],
                defaults={
                    'full_name': spec['full_name'],
                    'role': spec['role'],
                    'is_staff': spec['is_staff'],
                    'is_superuser': spec['is_superuser'],
                    'is_active': True,
                    'email_verified': True,
                    'license_no': spec.get('license_no') or None,
                },
            )
            if not created:
                user.full_name = spec['full_name']
                user.role = spec['role']
                user.is_staff = spec['is_staff']
                user.is_superuser = spec['is_superuser']
                user.is_active = True
                user.email_verified = True
                user.license_no = spec.get('license_no') or None

            if created or reset_passwords:
                user.set_password(DEMO_PASSWORD)
            user.save()

            action = 'Created' if created else 'Updated'
            self.stdout.write(self.style.SUCCESS(f'  {action} {spec["role"]}: {spec["email"]}'))

            if spec['role'] == 'police':
                Officer.objects.update_or_create(
                    user=user,
                    defaults={
                        'badge_no': spec['badge_no'],
                        'rank': spec.get('rank', ''),
                        'department': 'Traffic Enforcement',
                        'station': station,
                        'status': 'active',
                    },
                )

            if spec['role'] == 'driver':
                Driver.objects.update_or_create(
                    user=user,
                    defaults={
                        'license_no': spec['driver_license'],
                        'license_expiry': date.today() + timedelta(days=365 * 3),
                        'kyc_status': 'approved',
                        'status': 'active',
                    },
                )

        if accounts_only:
            self.stdout.write(self.style.SUCCESS('Demo accounts synced (accounts-only).'))
            self.stdout.write(f'  Admin: admin@camtraffic.demo / {DEMO_PASSWORD}')
            return

        call_command('seed_violation_rules')
        call_command('seed_data')
        self._ensure_sample_violation()

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Demo environment ready.'))
        self.stdout.write('')
        self.stdout.write('  Admin portal  http://localhost:5174')
        self.stdout.write('    admin@camtraffic.demo')
        self.stdout.write('')
        self.stdout.write('  User portal   http://localhost:5173')
        self.stdout.write('    Officer tab → officer@camtraffic.demo')
        self.stdout.write('    Driver tab  → driver@camtraffic.demo')
        self.stdout.write('')
        self.stdout.write(f'  Password (all demo accounts): {DEMO_PASSWORD}')
        self.stdout.write('')
        self.stdout.write('  See docs/final-year-project/DEMO-ACCOUNTS.md')

    def _ensure_sample_violation(self):
        """Idempotent sample violation so Violations pages are not empty in demos."""
        from vehicles.models import Vehicle
        from violations.models import TrafficViolation
        from violations.services import create_violation_record, evaluate_violation

        driver_user = User.objects.filter(email='driver@camtraffic.demo', role='driver').first()
        if not driver_user:
            return
        driver_profile = Driver.objects.filter(user=driver_user).first()
        if not driver_profile:
            return
        if TrafficViolation.objects.filter(driver=driver_profile).exists():
            self.stdout.write('  Sample violation already present')
            return

        evaluation = evaluate_violation(class_key='NO_PARKING', observed_action='PARKING')
        if not evaluation:
            self.stdout.write(self.style.WARNING('  Skipped sample violation — no matching rule'))
            return

        officer = Officer.objects.filter(user__email='officer@camtraffic.demo').first()
        vehicle = Vehicle.objects.filter(owner=driver_user).first()
        create_violation_record(
            driver=driver_profile,
            evaluation=evaluation,
            location='Phnom Penh Demo Intersection',
            officer=officer,
            vehicle=vehicle,
            status='pending_review',
        )
        self.stdout.write(self.style.SUCCESS('  Sample violation created'))
