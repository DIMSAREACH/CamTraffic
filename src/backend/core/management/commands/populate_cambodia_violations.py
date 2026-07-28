"""
Populate realistic, diverse Cambodian traffic violation data for demonstration.
Creates drivers, vehicles, and violations with authentic Cambodian context.
"""
import random
from datetime import datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from infrastructure.models import Camera, Road
from users.models import User, Driver, Officer
from vehicles.models import Vehicle
from violations.models import TrafficViolation


class Command(BaseCommand):
    help = 'Populate database with realistic Cambodian traffic violation data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing violations and test drivers first',
        )
        parser.add_argument(
            '--count',
            type=int,
            default=50,
            help='Number of violations to create (default: 50)',
        )

    def handle(self, *args, **options):
        clear_existing = options['clear']
        violation_count = options['count']

        if clear_existing:
            self.stdout.write('🗑️  Clearing existing test data...')
            # Find test driver users
            test_users = User.objects.filter(email__contains='test-driver')
            test_drivers = Driver.objects.filter(user__in=test_users)
            
            # Delete related data (Vehicle.owner is User, not Driver)
            TrafficViolation.objects.filter(driver__in=test_drivers).delete()
            Vehicle.objects.filter(owner__in=test_users).delete()
            test_drivers.delete()
            test_users.delete()
            self.stdout.write(self.style.SUCCESS('✅ Test data cleared'))

        self.stdout.write(f'📝 Creating {violation_count} realistic Cambodian violations...')

        # Get or create officer for violations
        officer = self._get_or_create_officer()
        
        # Get cameras and roads
        cameras = list(Camera.objects.all()[:10])
        roads = list(Road.objects.all()[:20])
        
        if not cameras:
            self.stdout.write(self.style.WARNING('⚠️  No cameras found. Some violations will not have camera references.'))
        if not roads:
            self.stdout.write(self.style.WARNING('⚠️  No roads found. Some violations will not have road references.'))

        # Create violations with diverse Cambodian data
        created_count = 0
        for i in range(violation_count):
            try:
                with transaction.atomic():
                    driver, vehicle = self._create_driver_and_vehicle(i)
                    violation = self._create_realistic_violation(
                        driver, vehicle, officer, cameras, roads
                    )
                    created_count += 1
                    
                    if (i + 1) % 10 == 0:
                        self.stdout.write(f'  ✓ Created {i + 1}/{violation_count} violations...')
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  ⚠️  Skipped violation {i + 1}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'\n✅ Successfully created {created_count} realistic Cambodian violations!'))
        self.stdout.write(self.style.SUCCESS(f'   • Drivers: {created_count}'))
        self.stdout.write(self.style.SUCCESS(f'   • Vehicles: {created_count}'))
        self.stdout.write(self.style.SUCCESS(f'   • Violations: {created_count}'))

    def _get_or_create_officer(self):
        """Get or create an officer for recording violations."""
        officer_user, _ = User.objects.get_or_create(
            email='officer@test.com',
            defaults={
                'full_name': 'Sok Pisey',
                'role': 'police',
                'phone': '012-345-678',
            }
        )
        if not hasattr(officer_user, 'officer_profile'):
            from infrastructure.models import PoliceStation
            station = PoliceStation.objects.first()
            Officer.objects.create(
                user=officer_user,
                station=station,
                badge_number='PP-001',
                rank='Sergeant',
            )
        return officer_user.officer_profile

    def _create_driver_and_vehicle(self, index):
        """Create a realistic Cambodian driver and their vehicle."""
        # Realistic Cambodian names
        cambodian_names = [
            ('Sok', 'Chantha'), ('Chea', 'Sokha'), ('Pich', 'Sothea'), ('Heng', 'Dara'),
            ('Hor', 'Sophea'), ('Kong', 'Rattana'), ('Lim', 'Bopha'), ('Meas', 'Kunthea'),
            ('Nhem', 'Sreypov'), ('Ouk', 'Chanthy'), ('Prak', 'Piseth'), ('Ros', 'Virak'),
            ('Sao', 'Samnang'), ('Tep', 'Sophal'), ('Ung', 'Kimheng'), ('Vong', 'Phirun'),
            ('Yem', 'Sokchea'), ('Khiev', 'Bunrith'), ('Leng', 'Socheat'), ('Men', 'Veasna'),
            ('Nou', 'Chandara'), ('Seng', 'Rithy'), ('Touch', 'Sovann'), ('Van', 'Panha'),
            ('Yen', 'Raksa'), ('Chann', 'Kosal'), ('Horn', 'Narith'), ('Keo', 'Vicheka'),
            ('Long', 'Sovanna'), ('Mao', 'Serey'), ('Nuon', 'Ponleu'), ('Pen', 'Thida'),
            ('San', 'Sreyleak'), ('Tan', 'Molika'), ('Vann', 'Bunnak'), ('Yim', 'Pisey'),
        ]
        
        first_name, last_name = random.choice(cambodian_names)
        full_name = f'{first_name} {last_name}'
        
        # Cambodian phone format
        phone_prefix = random.choice(['010', '011', '012', '015', '016', '017', '069', '070', '077', '078', '081', '085', '086', '087', '089', '092', '095', '096', '097', '098', '099'])
        phone = f'{phone_prefix}-{random.randint(100,999)}-{random.randint(100,999)}'
        
        # Cambodian license format (e.g., PP-1234567) - use ONLY index for absolute uniqueness
        prefixes = ['PP', 'KM', 'SR', 'BT', 'KS', 'KC', 'KH', 'KT', 'PV', 'PS']
        license_prefix = prefixes[index % len(prefixes)]  # Deterministic prefix based on index
        # Use index for guaranteed uniqueness
        unique_id = 100000 + index  # Starts from 100000, incrementing by 1
        license_no = f'{license_prefix}-{unique_id}'
        
        # Create driver user (provision_user_account will auto-create Driver profile)
        email = f'test-driver-{index}@example.com'
        user = User.objects.create_user(
            email=email,
            password='testpass123',
            full_name=full_name,
            role='driver',
            phone=phone,
            license_no=license_no,
            address=self._random_cambodian_address(),
        )
        
        # Get the auto-created driver profile and update fields
        driver = user.driver_profile
        driver.license_expiry = timezone.now().date() + timedelta(days=random.randint(30, 1800))
        driver.demerit_points = random.randint(0, 8)
        driver.kyc_status = 'approved'
        driver.status = 'active'
        driver.save()
        
        # Create vehicle with Cambodian plate
        vehicle = self._create_cambodian_vehicle(driver, license_prefix, index)
        
        return driver, vehicle

    def _create_cambodian_vehicle(self, driver, province_code, index=0):
        """Create a vehicle with realistic Cambodian license plate."""
        # Cambodian vehicle types matching Vehicle model choices
        vehicle_types = [
            ('motorcycle', ['Honda Dream', 'Honda Wave', 'Yamaha Exciter', 'Suzuki Raider', 'SYM Attila']),
            ('motorcycle', ['Honda Click', 'Yamaha Nouvo', 'Honda Scoopy', 'Yamaha Mio']),
            ('car', ['Toyota Camry', 'Toyota Vios', 'Honda Civic', 'Mazda 3', 'Hyundai Elantra']),
            ('car', ['Toyota Highlander', 'Honda CR-V', 'Ford Ranger', 'Isuzu D-Max', 'Mitsubishi Triton']),
            ('car', ['Toyota Land Cruiser', 'Toyota Fortuner', 'Ford Everest', 'Mazda CX-5']),
            ('truck', ['Hino', 'Isuzu', 'Mitsubishi Fuso']),
            ('tuk-tuk', ['Bajaj RE', 'TVS King', 'Piaggio Ape']),
        ]
        
        vehicle_type, models = random.choice(vehicle_types)
        model = random.choice(models)
        
        # Cambodian plate format: PP 1A-2345 or 1AA-2345
        # Use index to ensure uniqueness
        unique_num = 1000 + index  # Starts from 1000 and increments
        letter_choices = "ABCDEFGHJKLMNPQRSTUVWXYZ"
        letter = letter_choices[index % len(letter_choices)]  # Deterministic letter
        plate_number = f'{province_code} {(index % 9) + 1}{letter}-{unique_num}'
        
        # Vehicle colors common in Cambodia
        colors = ['White', 'Black', 'Silver', 'Red', 'Blue', 'Grey', 'Brown', 'Yellow']
        
        vehicle = Vehicle.objects.create(
            driver=driver,
            owner=driver.user,
            plate_number=plate_number,
            vehicle_type=vehicle_type,  # Already lowercase: 'car', 'motorcycle', 'truck', 'tuk-tuk'
            make=model.split()[0],
            model=model,
            color=random.choice(colors),
            year=random.randint(2010, 2025),
            status='active',
        )
        
        return vehicle

    def _random_cambodian_address(self):
        """Generate a random Cambodian address."""
        communes = [
            'Phsar Kandal', 'Phsar Thmey', 'Chaktomouk', 'Daun Penh', 'Wat Phnom',
            'Tonle Bassac', 'Boeung Keng Kang', 'Chamkar Mon', 'Tuol Svay Prey',
            'Olympic', 'Tuol Kork', 'Boeung Salang', 'Russei Keo', 'Chrang Chamres',
            'Sangkat Toul Tom Poung', 'Mittapheap', 'Nirouth', 'Kouk Khleang',
        ]
        
        streets = [
            'Street 51', 'Street 240', 'Street 271', 'Street 450', 'Street 315',
            'Monivong Blvd', 'Norodom Blvd', 'Preah Sihanouk Blvd', 'Mao Tse Toung Blvd',
            'Charles de Gaulle Blvd', 'Samdach Sothearos Blvd', 'Russian Federation Blvd',
            'Street 2004', 'Street 371', 'Street 432', 'Street 163',
        ]
        
        commune = random.choice(communes)
        street = random.choice(streets)
        building = random.choice(['', f'Building {random.randint(1,50)}, ', f'House {random.randint(1,999)}, '])
        
        return f'{building}{street}, {commune}, Phnom Penh'

    def _create_realistic_violation(self, driver, vehicle, officer, cameras, roads):
        """Create a realistic traffic violation with Cambodian context."""
        # Diverse violation scenarios
        violation_scenarios = [
            {
                'type': 'NO_PARKING',
                'title': 'No Parking Violation',
                'locations': ['Sisowath Quay', 'Street 51', 'Riverside area', 'Central Market area', 'Street 240'],
                'description': 'Parked in a no-parking zone',
                'fine': Decimal('50.00'),
            },
            {
                'type': 'NO_ENTRY',
                'title': 'No Entry Violation',
                'locations': ['Street 178', 'Street 240', 'Monivong Blvd', 'Street 271', 'Street 51'],
                'description': 'Entered a restricted area or one-way street in wrong direction',
                'fine': Decimal('100.00'),
            },
            {
                'type': 'ILLEGAL_LEFT_TURN',
                'title': 'Illegal Left Turn',
                'locations': ['Monivong & Mao Tse Toung junction', 'Norodom & Street 240', 'Charles de Gaulle Blvd', 'Street 271 junction'],
                'description': 'Made a left turn where prohibited',
                'fine': Decimal('75.00'),
            },
            {
                'type': 'ILLEGAL_RIGHT_TURN',
                'title': 'Illegal Right Turn',
                'locations': ['Preah Sihanouk Blvd', 'Street 51 junction', 'Riverside junction', 'Russian Blvd'],
                'description': 'Made a right turn where prohibited',
                'fine': Decimal('75.00'),
            },
            {
                'type': 'ILLEGAL_U_TURN',
                'title': 'Illegal U-Turn',
                'locations': ['Monivong Blvd', 'Norodom Blvd', 'Hun Sen Blvd', 'Street 271'],
                'description': 'Made a U-turn where prohibited',
                'fine': Decimal('80.00'),
            },
            {
                'type': 'NO_STOPPING',
                'title': 'No Stopping Violation',
                'locations': ['Monivong Bridge', 'Japanese Bridge approach', 'Independence Monument circle', 'Street 240'],
                'description': 'Stopped vehicle in a no-stopping zone',
                'fine': Decimal('60.00'),
            },
            {
                'type': 'WEIGHT_LIMIT_VIOLATION',
                'title': 'Weight Limit Exceeded',
                'locations': ['National Road 1', 'National Road 4', 'National Road 5', 'Chroy Changvar Bridge'],
                'description': 'Vehicle exceeded posted weight limit',
                'fine': Decimal('200.00'),
            },
        ]
        
        scenario = random.choice(violation_scenarios)
        location_detail = random.choice(scenario['locations'])
        
        # Random date within last 60 days
        days_ago = random.randint(0, 60)
        hours = random.randint(6, 22)  # 6 AM to 10 PM
        minutes = random.randint(0, 59)
        
        violation_time = timezone.now() - timedelta(days=days_ago, hours=hours, minutes=minutes)
        
        # Status distribution: 40% confirmed, 30% pending, 20% rejected, 10% draft
        status_weights = ['confirmed'] * 40 + ['pending_review'] * 30 + ['rejected'] * 20 + ['draft'] * 10
        status = random.choice(status_weights)
        
        # Select random camera and road
        camera = random.choice(cameras) if cameras else None
        road = random.choice(roads) if roads else None
        
        violation = TrafficViolation.objects.create(
            driver=driver,
            vehicle=vehicle,
            officer=officer,
            camera=camera,
            road=road,
            violation_type=scenario['type'],
            location=location_detail,
            violation_date=violation_time,
            status=status,
            description=scenario['description'],
            officer_note=self._generate_notes(scenario['type'], status),
            plate_detected=vehicle.plate_number if vehicle else '',
            ai_confidence_score=Decimal(str(random.uniform(75, 99))),
        )
        
        return violation

    def _generate_notes(self, violation_type, status):
        """Generate contextual notes for violations."""
        notes_templates = {
            'confirmed': [
                'Clear evidence from camera footage. Driver identified.',
                'Violation confirmed by reviewing officer. Fine issued.',
                'Multiple angle camera verification completed.',
                'License plate clearly visible. Evidence archived.',
            ],
            'rejected': [
                'Insufficient evidence. Camera angle obstructed.',
                'License plate not clearly visible in footage.',
                'Disputed by driver. Insufficient proof to proceed.',
                'Technical issue with camera timestamp. Cannot confirm.',
            ],
            'pending_review': [
                'Awaiting officer review.',
                'Camera footage under analysis.',
                'Driver notification pending.',
                'Evidence being processed.',
            ],
            'draft': [
                'Preliminary detection. Manual verification needed.',
                'AI detection flagged. Awaiting review.',
            ],
        }
        
        template_list = notes_templates.get(status, ['Violation recorded.'])
        return random.choice(template_list)
