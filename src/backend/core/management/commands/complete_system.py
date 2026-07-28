"""
Ensure CamTraffic modules are complete and FK-linked for thesis defense demos.

Runs:
  1. seed_demo --reset-passwords  (canonical portal logins)
  2. load_pdf_seed_demo           (Phnom Penh PDF locations + matching private data)
  3. Integrity report across Admin / Officer / Driver modules
"""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db.models import Count, Q

from ai_detection.models import AIDetectionLog
from appeals.models import ViolationAppeal
from fines.models import Fine
from infrastructure.models import Camera, PoliceStation, Road, TrafficSignal
from traffic_signs.models import TrafficSign
from users.models import Driver, Officer
from vehicles.models import Vehicle
from violations.models import TrafficViolation, ViolationRule

User = get_user_model()


class Command(BaseCommand):
    help = 'Complete system: demo accounts + PDF seed + cross-module integrity check'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-pdf-seed',
            action='store_true',
            help='Only sync demo accounts and report integrity (skip PDF bundle load)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Pass through to seed commands when DEBUG=False',
        )

    def handle(self, *args, **options):
        force = options['force']
        self.stdout.write(self.style.MIGRATE_HEADING('CamTraffic — complete system'))

        self.stdout.write('\n[1/3] Demo accounts…')
        call_command('seed_demo', reset_passwords=True, force=force)

        if not options['skip_pdf_seed']:
            self.stdout.write('\n[2/3] PDF Phnom Penh seed…')
            call_command('load_pdf_seed_demo', force=force)
        else:
            self.stdout.write('\n[2/3] Skipped PDF seed')

        self.stdout.write('\n[3/3] Module integrity report…')
        self._report()

    def _report(self) -> None:
        rows = [
            ('Users', User.objects.filter(is_active=True, deleted_at__isnull=True).count()),
            ('Drivers', Driver.objects.count()),
            ('Officers', Officer.objects.count()),
            ('Police stations', PoliceStation.objects.count()),
            ('Roads', Road.objects.filter(is_deleted=False).count()),
            ('Intersections (road_type)', Road.objects.filter(road_type='intersection').count()),
            ('Cameras', Camera.objects.count()),
            ('Traffic signals', TrafficSignal.objects.count()),
            ('Traffic signs', TrafficSign.objects.count()),
            ('Vehicles', Vehicle.objects.count()),
            ('Violation rules', ViolationRule.objects.count()),
            ('Violations', TrafficViolation.objects.count()),
            ('Fines', Fine.objects.count()),
            ('Appeals', ViolationAppeal.objects.count()),
            ('AI detection logs', AIDetectionLog.objects.count()),
        ]
        for label, n in rows:
            self.stdout.write(f'  {label:28} {n}')

        issues = []
        if not User.objects.filter(email='admin@camtraffic.demo').exists():
            issues.append('Missing admin@camtraffic.demo')
        if not User.objects.filter(email='officer@camtraffic.demo').exists():
            issues.append('Missing officer@camtraffic.demo')
        if not User.objects.filter(email='driver@camtraffic.demo').exists():
            issues.append('Missing driver@camtraffic.demo')

        orphan_v = TrafficViolation.objects.filter(
            Q(officer__isnull=True) | Q(camera__isnull=True) | Q(road__isnull=True) | Q(vehicle__isnull=True)
        ).count()
        if orphan_v:
            issues.append(f'{orphan_v} violations missing officer/camera/road/vehicle')

        orphan_f = Fine.objects.filter(violation__isnull=True).count()
        if orphan_f:
            issues.append(f'{orphan_f} fines without violation link')

        if TrafficSignal.objects.count() == 0:
            issues.append('No traffic signals (run load_pdf_seed_demo)')

        if Camera.objects.count() == 0:
            issues.append('No cameras')

        self.stdout.write('')
        if issues:
            self.stdout.write(self.style.WARNING('Integrity warnings:'))
            for msg in issues:
                self.stdout.write(self.style.WARNING(f'  - {msg}'))
        else:
            self.stdout.write(self.style.SUCCESS(
                'All core modules linked — Admin / Officer / Driver data is consistent.'
            ))

        # Status distribution for defense talking points
        self.stdout.write('')
        self.stdout.write('Violation status: ' + str(list(
            TrafficViolation.objects.values('status').annotate(c=Count('id')).order_by('status')
        )))
        self.stdout.write('Fine status: ' + str(list(
            Fine.objects.values('status').annotate(c=Count('id')).order_by('status')
        )))
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('System ready for portal demos.'))
        self.stdout.write('  Admin   http://127.0.0.1:5174  admin@camtraffic.demo')
        self.stdout.write('  Officer http://127.0.0.1:5173  officer@camtraffic.demo')
        self.stdout.write('  Driver  http://127.0.0.1:5173  driver@camtraffic.demo')
        self.stdout.write('  Password: CamTraffic@2026!')
