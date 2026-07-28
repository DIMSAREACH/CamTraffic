"""Ensure COMPLETE-SYSTEM-WORKFLOW demo data readiness (OCR plate 2A-1234)."""
from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from vehicles.models import Vehicle
from users.models import Driver

User = get_user_model()


class Command(BaseCommand):
    help = 'Ensure demo driver plate 2A-1234 exists for COMPLETE-SYSTEM-WORKFLOW demo path'

    def handle(self, *args, **options):
        demo = (
            User.objects.filter(email__iexact='driver@camtraffic.demo', is_active=True).first()
            or User.objects.filter(role='driver', email__icontains='camtraffic.demo', is_active=True).first()
        )
        if not demo:
            self.stderr.write(self.style.ERROR('No demo driver found (driver@camtraffic.demo)'))
            return

        profile, _ = Driver.objects.get_or_create(
            user=demo,
            defaults={'license_no': getattr(demo, 'license_no', None) or f'LIC-{demo.id}'},
        )
        plate, created = Vehicle.objects.get_or_create(
            plate_number='2A-1234',
            defaults={
                'owner': demo,
                'driver': profile,
                'vehicle_type': 'car',
                'model': 'Toyota Camry (OCR demo)',
                'color': 'White',
                'year': 2022,
                'status': 'active',
            },
        )
        if not created:
            plate.owner = demo
            plate.driver = profile
            plate.status = 'active'
            plate.save(update_fields=['owner', 'driver', 'status'])

        self.stdout.write(self.style.SUCCESS(
            f'OCR demo plate 2A-1234 → {demo.email} ({"created" if created else "updated"})'
        ))
