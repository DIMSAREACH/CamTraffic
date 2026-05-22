"""Load sample traffic data (no users — create accounts yourself)."""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from ai_detection.models import AIDetectionLog
from fines.models import Fine
from notifications.models import Notification
from traffic_signs.models import TrafficSign
from vehicles.models import Vehicle

User = get_user_model()

SIGNS = [
    ('Stop Sign', 'KH-STOP', 'warning', 'Drivers must stop completely at the line.', 'Reduce speed and stop before crossing.'),
    ('No Entry', 'KH-NO-ENTRY', 'prohibitory', 'Entry prohibited for all vehicles.', 'Do not enter this road.'),
    ('Speed Limit 40', 'KH-SP40', 'mandatory', 'Maximum speed 40 km/h.', 'Do not exceed 40 km/h.'),
    ('Speed Limit 60', 'KH-SP60', 'mandatory', 'Maximum speed 60 km/h.', 'Do not exceed 60 km/h.'),
    ('Yield', 'KH-YIELD', 'warning', 'Give way to traffic on main road.', 'Slow down and yield.'),
    ('No Parking', 'KH-NOPARK', 'prohibitory', 'Parking not allowed.', 'Find legal parking elsewhere.'),
    ('Pedestrian Crossing', 'KH-PED', 'warning', 'Pedestrians may cross here.', 'Yield to pedestrians.'),
    ('One Way', 'KH-ONEWAY', 'mandatory', 'Traffic flows in arrow direction only.', 'Follow arrow direction.'),
    ('No U-Turn', 'KH-NOUT', 'prohibitory', 'U-turns prohibited.', 'Continue or turn at next junction.'),
    ('Roundabout', 'KH-ROUND', 'informative', 'Circular intersection ahead.', 'Yield to traffic in roundabout.'),
    (
        'No Left Turn (R1-01)',
        'R1-01',
        'prohibitory',
        (
            'R1-01 — ហាមបត់ឆ្វេង (No Left Turn). Symbol: left-turn arrow crossed by a red diagonal slash. '
            'All vehicles are prohibited from turning left at this location; continue straight or turn right only.'
        ),
        'Do not turn left. Go straight or turn right where permitted.',
    ),
]


class Command(BaseCommand):
    help = 'Seed traffic signs and optional sample fines (does not create users or passwords)'

    def handle(self, *args, **options):
        self.stdout.write('Seeding CamTraffic sample data (users are not created)...')

        for name, code, cat, desc, guide in SIGNS:
            TrafficSign.objects.get_or_create(
                sign_code=code,
                defaults={'sign_name': name, 'category': cat, 'description': desc, 'guidance': guide},
            )
        self.stdout.write(self.style.SUCCESS(f'  Traffic signs: {len(SIGNS)}'))

        police = User.objects.filter(role='police', is_active=True).first()
        drivers = list(User.objects.filter(role='driver', is_active=True).order_by('id')[:3])

        if len(drivers) < 1 or not police:
            self.stdout.write(self.style.WARNING(
                '  Skipped sample vehicles, fines, and notifications — need at least one police '
                'and one driver account. Create them in the admin portal or via registration, then '
                'run seed_data again if you want sample records.'
            ))
        else:
            if not Vehicle.objects.exists():
                Vehicle.objects.create(
                    owner=drivers[0], plate_number='2A-1234', vehicle_type='car',
                    model='Toyota Camry', color='White', year=2022,
                )
                if len(drivers) > 1:
                    Vehicle.objects.create(
                        owner=drivers[1], plate_number='1B-5678', vehicle_type='motorcycle',
                        model='Honda Wave', color='Red', year=2021,
                    )
                self.stdout.write(self.style.SUCCESS('  Sample vehicles created'))

            if not Fine.objects.exists():
                Fine.objects.create(
                    driver=drivers[0], police=police, amount=Decimal('25.00'),
                    reason='Speeding in school zone', location='Phnom Penh, Chamkarmon',
                    vehicle_plate='2A-1234', status='pending',
                )
                if len(drivers) > 1:
                    Fine.objects.create(
                        driver=drivers[1], police=police, amount=Decimal('15.00'),
                        reason='Illegal parking', location='Siem Reap, Old Market',
                        vehicle_plate='1B-5678', status='paid',
                    )
                self.stdout.write(self.style.SUCCESS('  Sample fines created'))

            if not Notification.objects.exists():
                for d in drivers[:2]:
                    Notification.objects.create(
                        user=d, title='Welcome to CamTraffic',
                        message='Use AI Detection to learn Cambodia traffic signs.',
                        type='system',
                    )
                self.stdout.write(self.style.SUCCESS('  Sample notifications created'))

        self.stdout.write(self.style.SUCCESS('Seed complete.'))
        self.stdout.write('  No login accounts were added. Use: python manage.py create_admin')
