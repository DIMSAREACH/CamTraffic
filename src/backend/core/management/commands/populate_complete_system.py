"""
Populate ALL modules with 100 consistent, matching real Cambodian data.
Creates a complete, realistic dataset for the entire CamTraffic system.
"""
import random
from datetime import datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from infrastructure.models import Camera, Road, PoliceStation
from users.models import User, Driver, Officer
from vehicles.models import Vehicle
from violations.models import TrafficViolation
from fines.models import Fine
from ai_detection.models import AIDetectionLog


class Command(BaseCommand):
    help = 'Populate complete system with 100 consistent Cambodian records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=100,
            help='Number of records to create (default: 100)',
        )

    def handle(self, *args, **options):
        count = options['count']
        
        self.stdout.write(self.style.SUCCESS(f'\n🚀 Populating CamTraffic System with {count} Records\n'))
        
        # Step 1: Create Police Infrastructure
        self.stdout.write('📍 Step 1/7: Creating police infrastructure...')
        stations = self._create_police_stations()
        officers = self._create_officers(stations)
        self.stdout.write(self.style.SUCCESS(f'   ✓ Created {len(stations)} police stations'))
        self.stdout.write(self.style.SUCCESS(f'   ✓ Created {len(officers)} officers'))
        
        # Step 2: Create Road Infrastructure
        self.stdout.write('\n🛣️  Step 2/7: Creating roads...')
        roads = self._create_roads()
        self.stdout.write(self.style.SUCCESS(f'   ✓ Created {len(roads)} roads'))
        
        # Step 3: Create Cameras
        self.stdout.write('\n📷 Step 3/7: Creating cameras...')
        cameras = self._create_cameras(roads)
        self.stdout.write(self.style.SUCCESS(f'   ✓ Created {len(cameras)} cameras'))
        
        # Step 4: Create Drivers & Vehicles
        self.stdout.write(f'\n👥 Step 4/7: Creating {count} drivers and vehicles...')
        drivers_vehicles = []
        for i in range(count):
            with transaction.atomic():
                driver, vehicle = self._create_driver_and_vehicle(i)
                drivers_vehicles.append((driver, vehicle))
            if (i + 1) % 20 == 0:
                self.stdout.write(f'   ✓ Created {i + 1}/{count}...')
        self.stdout.write(self.style.SUCCESS(f'   ✓ Created {count} drivers'))
        self.stdout.write(self.style.SUCCESS(f'   ✓ Created {count} vehicles'))
        
        # Step 5: Create Violations
        self.stdout.write(f'\n⚠️  Step 5/7: Creating {count} violations...')
        violations = []
        for i, (driver, vehicle) in enumerate(drivers_vehicles):
            with transaction.atomic():
                officer = random.choice(officers)
                camera = random.choice(cameras)
                road = random.choice(roads)
                violation = self._create_violation(driver, vehicle, officer, camera, road, i)
                violations.append(violation)
            if (i + 1) % 20 == 0:
                self.stdout.write(f'   ✓ Created {i + 1}/{count}...')
        self.stdout.write(self.style.SUCCESS(f'   ✓ Created {count} violations'))
        
        # Step 6: Create Fines
        self.stdout.write('\n💰 Step 6/7: Creating fines for confirmed violations...')
        fines = self._create_fines(violations, officers)
        self.stdout.write(self.style.SUCCESS(f'   ✓ Created {len(fines)} fines'))
        
        # Step 7: Count AI detection logs
        ai_logs_count = AIDetectionLog.objects.count()
        
        # Step 8: Summary
        self.stdout.write(self.style.SUCCESS('\n\n✅ SYSTEM POPULATED SUCCESSFULLY!\n'))
        self._print_summary(count, len(fines), len(stations), len(officers), len(roads), len(cameras), ai_logs_count)

    def _create_police_stations(self):
        """Create realistic Phnom Penh police stations."""
        stations_data = [
            {'name': 'Phnom Penh Central Traffic Police', 'code': 'TPP-CENTRAL', 'region': 'Daun Penh', 'address': 'Street 106, Phnom Penh'},
            {'name': 'Toul Kork Traffic Station', 'code': 'TPP-TK', 'region': 'Tuol Kouk', 'address': 'Street 289, Toul Kork'},
            {'name': 'Chamkar Mon Police Station', 'code': 'TPP-CM', 'region': 'Chamkar Mon', 'address': 'Monivong Blvd, Chamkar Mon'},
            {'name': 'Russei Keo Traffic Unit', 'code': 'TPP-RK', 'region': 'Russey Keo', 'address': 'Street 271, Russei Keo'},
            {'name': 'Mean Chey Station', 'code': 'TPP-MC', 'region': 'Mean Chey', 'address': 'National Road 3, Mean Chey'},
        ]
        
        stations = []
        for data in stations_data:
            station, _ = PoliceStation.objects.get_or_create(
                code=data['code'],
                defaults={
                    'name': data['name'],
                    'city': 'Phnom Penh',
                    'region': data['region'],
                    'address': data['address'],
                    'phone': f'023-{random.randint(100000, 999999)}',
                    'status': 'active',
                }
            )
            stations.append(station)
        return stations

    def _create_officers(self, stations):
        """Create traffic police officers."""
        officer_names = [
            ('Sok', 'Virak'), ('Chea', 'Samnang'), ('Pich', 'Rattana'),
            ('Heng', 'Sophal'), ('Kong', 'Piseth'), ('Lim', 'Bunrith'),
            ('Meas', 'Rithy'), ('Nhem', 'Socheat'), ('Ouk', 'Veasna'),
            ('Prak', 'Kosal'),
        ]
        
        officers = []
        for i, (first, last) in enumerate(officer_names):
            # Real government email format
            email = f'{first.lower()}.{last.lower()}@traffic.gov.kh'
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                user = User.objects.create_user(
                    email=email,
                    password='officer123',
                    full_name=f'{first} {last}',
                    role='police',
                    phone=f'012-{random.randint(100000, 999999)}',
                )
                
                Officer.objects.update_or_create(
                    user=user,
                    defaults={
                        'badge_no': f'TPP-{1000 + i}',
                        'rank': random.choice(['Officer', 'Sergeant', 'Lieutenant', 'Captain']),
                        'department': 'Traffic Police',
                        'station': random.choice(stations),
                        'status': 'active',
                    }
                )
            officers.append(user.officer_profile)
        return officers

    def _create_roads(self):
        """Create major Phnom Penh roads."""
        roads_data = [
            {'name': 'Monivong Boulevard', 'type': 'Boulevard', 'speed_limit': 50},
            {'name': 'Norodom Boulevard', 'type': 'Boulevard', 'speed_limit': 50},
            {'name': 'Sisowath Quay', 'type': 'Main Road', 'speed_limit': 40},
            {'name': 'Street 51', 'type': 'Street', 'speed_limit': 40},
            {'name': 'Street 240', 'type': 'Street', 'speed_limit': 40},
            {'name': 'Street 271', 'type': 'Street', 'speed_limit': 40},
            {'name': 'Street 178', 'type': 'Street', 'speed_limit': 40},
            {'name': 'Mao Tse Toung Boulevard', 'type': 'Boulevard', 'speed_limit': 60},
            {'name': 'Charles de Gaulle Boulevard', 'type': 'Boulevard', 'speed_limit': 60},
            {'name': 'Hun Sen Boulevard', 'type': 'Boulevard', 'speed_limit': 60},
            {'name': 'Preah Sihanouk Boulevard', 'type': 'Boulevard', 'speed_limit': 50},
            {'name': 'Russian Boulevard', 'type': 'Boulevard', 'speed_limit': 60},
            {'name': 'National Road 1', 'type': 'Highway', 'speed_limit': 90},
            {'name': 'National Road 4', 'type': 'Highway', 'speed_limit': 90},
            {'name': 'National Road 5', 'type': 'Highway', 'speed_limit': 90},
        ]
        
        roads = []
        for data in roads_data:
            road, _ = Road.objects.get_or_create(
                name=data['name'],
                defaults={
                    'road_type': data['type'],
                    'speed_limit': data['speed_limit'],
                    'district': 'Phnom Penh',
                    'status': 'active',
                }
            )
            roads.append(road)
        return roads

    def _create_cameras(self, roads):
        """Create traffic cameras on roads."""
        camera_locations = [
            ('Monivong & Mao Tse Toung Junction', 'Intersection'),
            ('Norodom & Street 240 Junction', 'Intersection'),
            ('Sisowath Quay - Riverside', 'Main Road'),
            ('Street 51 & Street 240 Junction', 'Intersection'),
            ('Central Market Area', 'Commercial Zone'),
            ('Independence Monument Circle', 'Monument'),
            ('Monivong Bridge', 'Bridge'),
            ('Japanese Bridge', 'Bridge'),
            ('Chroy Changvar Bridge', 'Bridge'),
            ('Olympic Stadium Area', 'Public Area'),
            ('Royal Palace Entrance', 'Heritage Site'),
            ('Aeon Mall Junction', 'Commercial Zone'),
            ('Russian Market Area', 'Commercial Zone'),
            ('Street 271 Junction', 'Intersection'),
            ('Hun Sen Park Entrance', 'Public Area'),
        ]
        
        cameras = []
        for i, (location, cam_type) in enumerate(camera_locations):
            road = random.choice(roads)
            camera, _ = Camera.objects.get_or_create(
                code=f'CAM-PP-{1000 + i}',
                defaults={
                    'name': location,
                    'description': f'Traffic camera at {location} — Hikvision iDS-TCD402-CR/12/64G',
                    'road': road,
                    'camera_type': 'speed',
                    'model': 'iDS-TCD402-CR/12/64G',
                    'brand': 'Hikvision',
                    'resolution': '1080p',
                    'fps': 25,
                    'ai_enabled': True,
                    'detection_type': 'street',
                    'latitude': Decimal(str(11.5564 + random.uniform(-0.05, 0.05))),
                    'longitude': Decimal(str(104.9282 + random.uniform(-0.05, 0.05))),
                    'status': 'active',
                }
            )
            # Ensure existing cameras also get Hikvision model
            if camera.model != 'iDS-TCD402-CR/12/64G':
                camera.model = 'iDS-TCD402-CR/12/64G'
                camera.brand = 'Hikvision'
                camera.camera_type = 'speed'
                camera.resolution = camera.resolution or '1080p'
                camera.save(update_fields=['model', 'brand', 'camera_type', 'resolution', 'updated_at'])
            cameras.append(camera)
        return cameras

    def _create_driver_and_vehicle(self, index):
        """Create driver and vehicle with matching data."""
        # Cambodian names
        names = [
            ('Sok', 'Chantha'), ('Chea', 'Sokha'), ('Pich', 'Sothea'), ('Heng', 'Dara'),
            ('Hor', 'Sophea'), ('Kong', 'Rattana'), ('Lim', 'Bopha'), ('Meas', 'Kunthea'),
            ('Nhem', 'Sreypov'), ('Ouk', 'Chanthy'), ('Prak', 'Piseth'), ('Ros', 'Virak'),
            ('Sao', 'Samnang'), ('Tep', 'Sophal'), ('Ung', 'Kimheng'), ('Vong', 'Phirun'),
            ('Yem', 'Sokchea'), ('Khiev', 'Bunrith'), ('Leng', 'Socheat'), ('Men', 'Veasna'),
            ('Nou', 'Chandara'), ('Seng', 'Rithy'), ('Touch', 'Sovann'), ('Van', 'Panha'),
            ('Yen', 'Raksa'), ('Chann', 'Kosal'), ('Horn', 'Narith'), ('Keo', 'Vicheka'),
            ('Long', 'Sovanna'), ('Mao', 'Serey'), ('Nuon', 'Ponleu'), ('Pen', 'Thida'),
        ]
        
        first_name, last_name = names[index % len(names)]
        full_name = f'{first_name} {last_name}'
        
        # License and plate
        prefixes = ['PP', 'KM', 'SR', 'BT', 'KS', 'KC', 'KH', 'KT', 'PV', 'PS']
        prefix = prefixes[index % len(prefixes)]
        license_no = f'{prefix}-{200000 + index}'
        plate_number = f'{prefix} {(index % 9) + 1}{"ABCDEFGHJKLMNPQRSTUVWXYZ"[index % 24]}-{2000 + index}'
        
        # Phone
        phone_prefix = random.choice(['010', '012', '015', '077', '078', '092', '096', '098'])
        phone = f'{phone_prefix}-{random.randint(100000, 999999)}'
        
        # Create user with realistic email
        email_providers = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']
        email_provider = random.choice(email_providers)
        # Format: firstname.lastname@provider.com
        email = f'{first_name.lower()}.{last_name.lower()}{index}@{email_provider}'
        
        user = User.objects.create_user(
            email=email,
            password='driver123',
            full_name=full_name,
            role='driver',
            phone=phone,
            license_no=license_no,
            address=self._random_address(),
        )
        
        # Update driver profile
        driver = user.driver_profile
        driver.license_expiry = timezone.now().date() + timedelta(days=random.randint(365, 1800))
        driver.demerit_points = random.randint(0, 6)
        driver.kyc_status = 'approved'
        driver.status = 'active'
        driver.save()
        
        # Create vehicle
        vehicles_data = [
            ('motorcycle', ['Honda Dream', 'Yamaha Exciter', 'Honda Click', 'Suzuki Raider']),
            ('car', ['Toyota Camry', 'Honda Civic', 'Mazda 3', 'Toyota Vios', 'Hyundai Elantra']),
            ('car', ['Toyota Fortuner', 'Ford Everest', 'Honda CR-V', 'Mazda CX-5']),
            ('truck', ['Hino', 'Isuzu', 'Mitsubishi Fuso']),
        ]
        
        vehicle_type, models = random.choice(vehicles_data)
        model = random.choice(models)
        colors = ['White', 'Black', 'Silver', 'Red', 'Blue', 'Grey']
        
        vehicle = Vehicle.objects.create(
            driver=driver,
            owner=user,
            plate_number=plate_number,
            vehicle_type=vehicle_type,
            make=model.split()[0],
            model=model,
            color=random.choice(colors),
            year=random.randint(2015, 2024),
            status='active',
        )
        
        return driver, vehicle

    def _create_violation(self, driver, vehicle, officer, camera, road, index):
        """Create realistic violation with AI detection log using REAL Cambodian traffic signs."""
        # Using actual traffic sign codes from the database
        violations_with_signs = [
            ('NO_PARKING', 'Parked in no-parking zone', 'ហាមចត', 'No parking zone', 'R2-10', 'no_parking'),
            ('NO_ENTRY', 'Entered restricted area', 'ហាមចូល', 'Restricted access', 'R1-04', 'no_entry'),
            ('ILLEGAL_LEFT_TURN', 'Made prohibited left turn', 'ហាមបត់ឆ្វេង', 'Left turn prohibited', 'R1-01', 'no_left_turn'),
            ('ILLEGAL_RIGHT_TURN', 'Made prohibited right turn', 'ហាមបត់ស្តាំ', 'Right turn prohibited', 'R1-02', 'no_right_turn'),
            ('ILLEGAL_U_TURN', 'Made prohibited U-turn', 'ហាមបត់ត្រឡប់ក្រោយ', 'U-turn prohibited', 'R1-03', 'no_u_turn'),
            ('NO_STOPPING', 'Stopped in no-stopping zone', 'ហាមឈប់', 'Stopping prohibited', 'I-033', 'no_stopping'),
            ('WEIGHT_LIMIT_VIOLATION', 'Exceeded weight limit', 'កំណត់ទំងន់សរុប', 'Weight restriction', 'I-044', 'weight_limit'),
        ]
        
        violation_type, description, sign_name, guidance, sign_code, class_key = random.choice(violations_with_signs)
        
        # Distribute violations across last 180 days (6 months) for better charts
        days_ago = random.randint(0, 180)
        violation_date = timezone.now() - timedelta(
            days=days_ago,
            hours=random.randint(6, 22),
            minutes=random.randint(0, 59)
        )
        
        # Status distribution
        status_choices = ['confirmed'] * 50 + ['pending_review'] * 30 + ['rejected'] * 15 + ['draft'] * 5
        status = random.choice(status_choices)
        
        # Prefer a real detection still when available (placeholder.jpg is often missing).
        from pathlib import Path
        import shutil
        import uuid as uuid_mod

        from django.conf import settings as dj_settings

        confidence = random.uniform(85, 99)
        upload_pool = sorted(
            Path(dj_settings.MEDIA_ROOT, 'ai', 'uploads').glob('*.jpg'),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )[:40]
        rel_upload = 'ai/system_detections/placeholder.jpg'
        if upload_pool:
            src = upload_pool[random.randrange(len(upload_pool))]
            rel_upload = f'ai/uploads/seed-detect-{uuid_mod.uuid4().hex[:8]}.jpg'
            dest = Path(dj_settings.MEDIA_ROOT) / rel_upload
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)

        ai_log = AIDetectionLog.objects.create(
            user=officer.user,
            uploaded_image=rel_upload,
            detected_sign=sign_name,
            confidence=confidence,
            description=description,
            guidance=guidance,
            processing_time=random.uniform(0.5, 2.5),
            review_status='approved' if status == 'confirmed' else 'pending',
            model_version='yolov8-cambodia-v2',
            detected_vehicles=[{
                'type': vehicle.vehicle_type,
                'confidence': confidence,
                'bbox': {'x1': 0.3, 'y1': 0.4, 'x2': 0.7, 'y2': 0.9},
            }],
            vehicle_count=1,
            detected_plate=vehicle.plate_number,
            plate_confidence=random.uniform(80, 95),
            plate_type='cambodia',
            plate_ocr_details=[{'text': vehicle.plate_number, 'conf': random.uniform(80, 95)}],
            matched_vehicle=vehicle,
        )
        
        # Update created_at to match violation date (for charts)
        AIDetectionLog.objects.filter(id=ai_log.id).update(created_at=violation_date)
        
        # Create violation linked to AI log (+ local evidence copy)
        evidence_rel = None
        if rel_upload:
            src_ev = Path(dj_settings.MEDIA_ROOT) / rel_upload
            if src_ev.is_file():
                evidence_rel = f'violations/evidence/seed-{uuid_mod.uuid4().hex[:10]}.jpg'
                dest_ev = Path(dj_settings.MEDIA_ROOT) / evidence_rel
                dest_ev.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src_ev, dest_ev)

        violation = TrafficViolation.objects.create(
            driver=driver,
            vehicle=vehicle,
            officer=officer,
            camera=camera,
            road=road,
            ai_detection_log=ai_log,
            violation_type=violation_type,
            detected_sign_code=sign_code,
            detected_class_key=class_key,
            location=f'{road.name} - {camera.name}',
            violation_date=violation_date,
            status=status,
            description=description,
            officer_note=self._generate_note(status),
            plate_detected=vehicle.plate_number,
            ai_confidence_score=Decimal(str(round(confidence, 2))),
            evidence_image=evidence_rel or '',
        )
        
        return violation

    def _create_fines(self, violations, officers):
        """Create fines for confirmed violations."""
        fine_amounts = {
            'NO_PARKING': Decimal('50.00'),
            'NO_ENTRY': Decimal('100.00'),
            'ILLEGAL_LEFT_TURN': Decimal('75.00'),
            'ILLEGAL_RIGHT_TURN': Decimal('75.00'),
            'ILLEGAL_U_TURN': Decimal('80.00'),
            'NO_STOPPING': Decimal('60.00'),
            'WEIGHT_LIMIT_VIOLATION': Decimal('200.00'),
        }
        
        fines = []
        for violation in violations:
            if violation.status == 'confirmed':
                amount = fine_amounts.get(violation.violation_type, Decimal('75.00'))
                due_date = violation.violation_date.date() + timedelta(days=30)
                
                # 30% paid, 70% pending
                if random.random() < 0.3:
                    status = 'paid'
                    paid_at = violation.violation_date + timedelta(days=random.randint(1, 28))
                else:
                    status = 'pending'
                    paid_at = None
                
                fine = Fine.objects.create(
                    violation=violation,
                    driver=violation.driver.user,
                    police=random.choice(officers).user,
                    amount=amount,
                    reason=violation.description,
                    status=status,
                    location=violation.location,
                    vehicle_plate=violation.plate_detected,
                    due_date=due_date,
                    paid_at=paid_at,
                )
                # Backdate fine creation to match violation date for charts
                Fine.objects.filter(id=fine.id).update(
                    created_at=violation.violation_date,
                    updated_at=violation.violation_date if status == 'pending' else paid_at
                )
                fines.append(fine)
        
        return fines

    def _random_address(self):
        """Generate Cambodian address."""
        streets = ['Street 51', 'Street 240', 'Street 271', 'Street 178', 'Monivong Blvd']
        areas = ['BKK1', 'BKK2', 'BKK3', 'Toul Kork', 'Chamkar Mon', 'Daun Penh']
        return f'{random.choice(streets)}, {random.choice(areas)}, Phnom Penh'

    def _generate_note(self, status):
        """Generate officer notes."""
        notes = {
            'confirmed': [
                'Clear evidence from camera. Violation confirmed.',
                'Driver identified. Fine issued.',
                'Evidence reviewed and verified.',
            ],
            'pending_review': [
                'Under review by traffic officer.',
                'Awaiting evidence verification.',
                'Pending driver identification.',
            ],
            'rejected': [
                'Insufficient evidence.',
                'Technical error in detection.',
                'Driver successfully appealed.',
            ],
            'draft': [
                'Preliminary detection. Requires review.',
                'AI flagged. Manual verification needed.',
            ],
        }
        return random.choice(notes.get(status, ['No notes']))

    def _print_summary(self, drivers, fines, stations, officers, roads, cameras, ai_logs):
        """Print creation summary."""
        self.stdout.write('━' * 60)
        self.stdout.write(self.style.SUCCESS('📊 CREATION SUMMARY'))
        self.stdout.write('━' * 60)
        self.stdout.write(f'   Police Stations:     {stations}')
        self.stdout.write(f'   Officers:            {officers}')
        self.stdout.write(f'   Roads:               {roads}')
        self.stdout.write(f'   Cameras:             {cameras}')
        self.stdout.write(f'   Drivers:             {drivers}')
        self.stdout.write(f'   Vehicles:            {drivers}')
        self.stdout.write(f'   Violations:          {drivers}')
        self.stdout.write(f'   AI Detection Logs:   {ai_logs}')
        self.stdout.write(f'   Fines:               {fines}')
        self.stdout.write('━' * 60)
        self.stdout.write('\n🎉 Your system now has realistic Cambodian data!')
        self.stdout.write('   ✓ Charts will show 6 months of data')
        self.stdout.write('   ✓ All violations linked to AI detections')
        self.stdout.write('   ✓ Traffic signs properly matched')
        self.stdout.write('\n   Refresh your browser to see the results.\n')
