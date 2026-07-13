"""Backfill RBAC, profiles, vehicles, and violation links after Day 2 migrations."""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from fines.models import Fine
from rbac.models import Permission, Role, RolePermission, UserRole
from users.models import Driver, Officer
from vehicles.models import Vehicle
from violations.models import TrafficViolation

User = get_user_model()

ROLE_MAP = {
    'admin': 'admin',
    'police': 'officer',
    'driver': 'driver',
}

PERMISSIONS = [
    ('users.view', 'view', 'users'),
    ('users.manage', 'manage', 'users'),
    ('signs.view', 'view', 'signs'),
    ('signs.manage', 'manage', 'signs'),
    ('fines.view', 'view', 'fines'),
    ('fines.manage', 'manage', 'fines'),
    ('vehicles.view', 'view', 'vehicles'),
    ('vehicles.manage', 'manage', 'vehicles'),
    ('violations.view', 'view', 'violations'),
    ('violations.manage', 'manage', 'violations'),
    ('infrastructure.manage', 'manage', 'infrastructure'),
    ('reports.view', 'view', 'reports'),
]

ROLE_PERMS = {
    'admin': [p[0] for p in PERMISSIONS],
    'officer': [
        'users.view', 'signs.view', 'fines.view', 'fines.manage',
        'vehicles.view', 'violations.view', 'violations.manage', 'reports.view',
    ],
    'driver': ['signs.view', 'fines.view', 'vehicles.view', 'vehicles.manage'],
}


class Command(BaseCommand):
    help = 'Seed RBAC, officer/driver profiles, vehicle drivers, and link fines to violations.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--skip-fines',
            action='store_true',
            help='Do not create placeholder violations for existing fines.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        self._seed_rbac()
        self._backfill_profiles()
        self._backfill_vehicle_drivers()
        if not options['skip_fines']:
            self._backfill_fine_violations()
        self.stdout.write(self.style.SUCCESS('ERD alignment backfill completed.'))

    def _seed_rbac(self):
        roles = {}
        for name in ('admin', 'officer', 'driver'):
            roles[name], _ = Role.objects.get_or_create(
                role_name=name,
                defaults={'description': f'{name.title()} role', 'status': 'active'},
            )

        perms = {}
        for perm_name, action_type, resource in PERMISSIONS:
            perms[perm_name], _ = Permission.objects.get_or_create(
                perm_name=perm_name,
                defaults={'action_type': action_type, 'resource': resource},
            )

        for role_name, perm_names in ROLE_PERMS.items():
            role = roles[role_name]
            for perm_name in perm_names:
                RolePermission.objects.get_or_create(role=role, permission=perms[perm_name])

        from users.profile_services import provision_user_account

        for user in User.objects.all():
            provision_user_account(user)

        self.stdout.write(f'RBAC: {Role.objects.count()} roles, {UserRole.objects.count()} user assignments')

    def _backfill_profiles(self):
        self.stdout.write(
            f'Profiles: {Officer.objects.count()} officers, {Driver.objects.count()} drivers'
        )

    def _backfill_vehicle_drivers(self):
        updated = 0
        for vehicle in Vehicle.objects.select_related('owner').filter(driver__isnull=True):
            if vehicle.owner.role != 'driver':
                continue
            try:
                driver_profile = vehicle.owner.driver_profile
            except Driver.DoesNotExist:
                continue
            vehicle.driver = driver_profile
            vehicle.save(update_fields=['driver'])
            updated += 1
        self.stdout.write(f'Vehicles linked to driver profile: {updated}')

    def _backfill_fine_violations(self):
        created = 0
        for fine in Fine.objects.filter(violation__isnull=True).select_related('driver', 'police'):
            try:
                driver_profile = fine.driver.driver_profile
            except Driver.DoesNotExist:
                license_no = (fine.driver.license_no or '').strip() or f'DRV-{str(fine.driver.id)[:8]}'
                driver_profile = Driver.objects.create(
                    user=fine.driver,
                    license_no=license_no,
                    status='active',
                )

            officer_profile = None
            if fine.police_id:
                officer_profile, _ = Officer.objects.get_or_create(
                    user=fine.police,
                    defaults={
                        'badge_no': f'BADGE-{str(fine.police.id)[:8]}',
                        'rank': 'Officer',
                        'department': 'Traffic Police',
                        'status': 'active',
                    },
                )

            vehicle = None
            if fine.vehicle_plate:
                vehicle = Vehicle.objects.filter(plate_number=fine.vehicle_plate).first()

            violation = TrafficViolation.objects.create(
                driver=driver_profile,
                vehicle=vehicle,
                officer=officer_profile,
                violation_date=fine.created_at,
                location=fine.location or 'Unknown',
                description=fine.reason,
                status='confirmed',
            )
            fine.violation = violation
            if not fine.due_date:
                fine.due_date = (fine.created_at + timedelta(days=30)).date()
            fine.save(update_fields=['violation', 'due_date'])
            created += 1

        self.stdout.write(f'Fines linked to violations: {created}')
