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
            # Ensure primary demo driver always has plate 2A-1234 (idempotent).
            demo_plates = [
                (drivers[0], '2A-1234', 'car', 'Toyota Camry', 'White', 2022),
            ]
            if len(drivers) > 1:
                demo_plates.append(
                    (drivers[1], '1B-5678', 'motorcycle', 'Honda Wave', 'Red', 2021),
                )
            created_vehicles = 0
            for owner, plate, vtype, model, color, year in demo_plates:
                _, created = Vehicle.objects.get_or_create(
                    plate_number=plate,
                    defaults={
                        'owner': owner,
                        'vehicle_type': vtype,
                        'model': model,
                        'color': color,
                        'year': year,
                    },
                )
                if created:
                    created_vehicles += 1
            if created_vehicles:
                self.stdout.write(self.style.SUCCESS(f'  Sample vehicles created ({created_vehicles})'))
            else:
                self.stdout.write('  Sample vehicles already present')

            # Ensure each demo driver has at least one fine they can see in the portal.
            created_fines = 0
            fine_specs = [
                (drivers[0], Decimal('25.00'), 'Speeding in school zone',
                 'Phnom Penh, Chamkarmon', '2A-1234', 'pending'),
            ]
            if len(drivers) > 1:
                fine_specs.append(
                    (drivers[1], Decimal('15.00'), 'Illegal parking',
                     'Siem Reap, Old Market', '1B-5678', 'paid'),
                )
            for driver, amount, reason, location, plate, status in fine_specs:
                if status == 'pending':
                    exists = Fine.objects.filter(driver=driver, vehicle_plate=plate, status='pending').exists()
                else:
                    exists = Fine.objects.filter(driver=driver, vehicle_plate=plate, status=status).exists()
                if exists:
                    continue
                Fine.objects.create(
                    driver=driver, police=police, amount=amount,
                    reason=reason, location=location,
                    vehicle_plate=plate, status=status,
                )
                created_fines += 1
            if created_fines:
                self.stdout.write(self.style.SUCCESS(f'  Sample fines created ({created_fines})'))
            else:
                self.stdout.write('  Sample fines already present for demo drivers')

            welcome_created = 0
            for d in drivers[:2]:
                if Notification.objects.filter(user=d, title='Welcome to CamTraffic').exists():
                    continue
                Notification.objects.create(
                    user=d, title='Welcome to CamTraffic',
                    message='Use AI Detection to learn Cambodia traffic signs.',
                    type='system',
                )
                welcome_created += 1
            if welcome_created:
                self.stdout.write(self.style.SUCCESS(f'  Sample notifications created ({welcome_created})'))

        self.stdout.write(self.style.SUCCESS('Seed complete.'))
        self.stdout.write('  No login accounts were added. Use: python manage.py create_admin')
