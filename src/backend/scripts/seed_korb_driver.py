"""Idempotent: enrich Korbkimheang18@gmail.com with 10 Cambodia-realistic portal records."""
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from appeals.models import ViolationAppeal
from fines.models import Fine
from infrastructure.models import Camera, Road
from notifications.models import Notification
from users.models import Driver, Officer
from vehicles.models import Vehicle
from violations.models import TrafficViolation
from violations.services import create_violation_record, evaluate_violation

EMAIL = 'Korbkimheang18@gmail.com'
# License follows plate-number form used across CamTraffic modules.
LICENSE = '1LK-9540'
CAR_PLATE = '2U-3108'
MOTO_PLATE = '1LK-9540'


def _usd_amount(raw) -> Decimal:
    amount = Decimal(str(raw or 0))
    # Some seeded rules use KHR-scale amounts; keep portal demos in USD.
    if amount >= 1000:
        amount = Decimal('25.00')
    if amount <= 0:
        amount = Decimal('10.00')
    return amount.quantize(Decimal('0.01'))


def run():
    User = get_user_model()

    with transaction.atomic():
        user = User.objects.select_for_update().get(email__iexact=EMAIL)
        driver = Driver.objects.select_for_update().get(user=user)
        officer = (
            Officer.objects.filter(user__email='officer@camtraffic.demo').first()
            or Officer.objects.filter(status='active').select_related('user').first()
        )
        camera = Camera.objects.filter(status='active').order_by('code').first()
        road = Road.objects.filter(city__icontains='Phnom Penh').first() or Road.objects.first()

        user.full_name = 'Korb Kimheang'
        user.role = 'driver'
        user.phone = '+855 12 675 733'
        user.address = 'Street 271, Sangkat Phnom Penh Thmey, Khan Sen Sok, Phnom Penh'
        user.license_no = LICENSE
        user.email_verified = True
        user.is_active = True
        user.save()

        driver.license_no = LICENSE
        driver.national_id = '010867573'
        driver.date_of_birth = date(1998, 5, 18)
        driver.license_expiry = date(2028, 5, 18)
        driver.kyc_status = 'approved'
        driver.status = 'active'
        if driver.demerit_points < 6:
            driver.demerit_points = 6
        driver.save()

        car, _ = Vehicle.objects.update_or_create(
            plate_number=CAR_PLATE,
            defaults={
                'owner': user,
                'driver': driver,
                'vehicle_type': 'car',
                'make': 'Toyota',
                'model': 'Prius',
                'color': 'White',
                'year': 2020,
                'engine_no': '2ZR-FXE-884210',
                'chassis_no': 'JTDKB20U503184572',
                'registration_expiry': date(2027, 3, 31),
                'status': 'active',
            },
        )

        moto, _ = Vehicle.objects.update_or_create(
            plate_number=MOTO_PLATE,
            defaults={
                'owner': user,
                'driver': driver,
                'vehicle_type': 'motorcycle',
                'make': 'Honda',
                'model': 'Wave 110i',
                'color': 'Red',
                'year': 2021,
                'engine_no': 'JF09E-552183',
                'chassis_no': 'MLHJF0910M5008821',
                'registration_expiry': date(2027, 8, 15),
                'status': 'active',
            },
        )

        # 10 real Phnom Penh enforcement events for the driver portal.
        specs = [
            {
                'class_key': 'NO_PARKING',
                'action': 'PARKING',
                'location': 'Monivong Blvd & Street 214, Chamkarmon, Phnom Penh',
                'status': 'confirmed',
                'vehicle': car,
                'days_ago': 4,
                'fine_status': 'pending',
                'note': 'White Toyota Prius parked in no-parking zone near Independence Monument corridor.',
                'appeal': False,
            },
            {
                'class_key': 'NO_U_TURN',
                'action': 'U_TURN',
                'location': 'Russian Blvd & Pasteur St, Tuol Kork, Phnom Penh',
                'status': 'confirmed',
                'vehicle': car,
                'days_ago': 11,
                'fine_status': 'paid',
                'note': 'Illegal U-turn observed at Russian Boulevard junction.',
                'appeal': False,
            },
            {
                'class_key': 'NO_LEFT_TURN',
                'action': 'LEFT_TURN',
                'location': 'Norodom Blvd & Sihanouk Blvd, Daun Penh, Phnom Penh',
                'status': 'confirmed',
                'vehicle': car,
                'days_ago': 18,
                'fine_status': 'paid',
                'note': 'Left turn against No Left Turn near Independence Monument.',
                'appeal': False,
            },
            {
                'class_key': 'NO_STOPPING',
                'action': 'STOPPING',
                'location': 'Sisowath Quay, Riverside, Phnom Penh',
                'status': 'confirmed',
                'vehicle': moto,
                'days_ago': 6,
                'fine_status': 'pending',
                'note': 'Honda Wave stopped in no-stopping zone along Riverside.',
                'appeal': False,
            },
            {
                'class_key': 'NO_ENTRY',
                'action': 'ENTER',
                'location': 'Street 51 one-way segment, Daun Penh, Phnom Penh',
                'status': 'confirmed',
                'vehicle': car,
                'days_ago': 22,
                'fine_status': 'overdue',
                'note': 'Vehicle entered a marked No Entry corridor on Street 51.',
                'appeal': True,
                'appeal_reason': 'Sign was blocked by a parked truck; I followed local traffic flow.',
                'appeal_status': 'pending',
            },
            {
                'class_key': 'NO_RIGHT_TURN',
                'action': 'RIGHT_TURN',
                'location': 'Mao Tse Tung Blvd & Street 271, Tuol Kork, Phnom Penh',
                'status': 'confirmed',
                'vehicle': car,
                'days_ago': 31,
                'fine_status': 'paid',
                'note': 'Right turn prohibited at Mao Tse Tung / Street 271 junction.',
                'appeal': False,
            },
            {
                'class_key': 'traffic_light',
                'action': 'run_red',
                'location': 'Confederation de la Russie Blvd & Street 271, Sen Sok, Phnom Penh',
                'status': 'confirmed',
                'vehicle': car,
                'days_ago': 9,
                'fine_status': 'pending',
                'note': 'Camera capture: Prius crossed stop line on red at Russian Blvd.',
                'appeal': False,
            },
            {
                'class_key': 'speed_limit',
                'action': 'speeding',
                'location': 'National Road 4 approach, Chaom Chao, Phnom Penh',
                'status': 'confirmed',
                'vehicle': car,
                'days_ago': 15,
                'fine_status': 'paid',
                'note': 'Speeding in 50 km/h zone near Chaom Chao interchange.',
                'appeal': False,
            },
            {
                'class_key': 'helmet',
                'action': 'no_helmet',
                'location': 'Street 2004, Sangkat Kakab, Khan Por Sen Chey, Phnom Penh',
                'status': 'confirmed',
                'vehicle': moto,
                'days_ago': 7,
                'fine_status': 'pending',
                'note': 'Rider on Honda Wave without helmet near Kakab market.',
                'appeal': False,
            },
            {
                'class_key': 'one_way',
                'action': 'wrong_way',
                'location': 'Street 63 (one-way), Chamkarmon, Phnom Penh',
                'status': 'confirmed',
                'vehicle': moto,
                'days_ago': 26,
                'fine_status': 'overdue',
                'note': 'Motorcycle traveling against one-way flow on Street 63.',
                'appeal': True,
                'appeal_reason': 'GPS reroute sent me into the one-way; I reversed immediately.',
                'appeal_status': 'dismissed',
            },
        ]

        created_v = 0
        created_f = 0
        created_a = 0
        for spec in specs:
            evaluation = evaluate_violation(
                class_key=spec['class_key'],
                observed_action=spec['action'],
            )
            if not evaluation:
                print('SKIP rule missing', spec['class_key'], spec['action'])
                continue

            v = TrafficViolation.objects.filter(
                driver=driver,
                violation_type=evaluation['violation_type'],
                location=spec['location'],
            ).first()
            if not v:
                v = create_violation_record(
                    driver=driver,
                    evaluation=evaluation,
                    location=spec['location'],
                    officer=officer,
                    vehicle=spec['vehicle'],
                    camera=camera,
                    road=road,
                    status=spec['status'],
                )
                v.officer_note = spec['note']
                v.plate_detected = spec['vehicle'].plate_number
                v.ai_confidence_score = Decimal('91.50')
                v.violation_date = timezone.now() - timedelta(days=spec['days_ago'])
                v.save()
                created_v += 1
                print('created violation', v.violation_type, '|', v.location)
            else:
                print('exists violation', v.violation_type, '|', v.location)

            fine = Fine.objects.filter(driver=user, violation=v).first()
            if not fine and spec.get('fine_status'):
                amount = _usd_amount(evaluation['default_fine_amount'])
                due = (timezone.now() - timedelta(days=spec['days_ago']) + timedelta(days=30)).date()
                paid = spec['fine_status'] == 'paid'
                fine = Fine.objects.create(
                    driver=user,
                    police=officer.user if officer else None,
                    violation=v,
                    amount=amount,
                    reason=evaluation.get('description')
                    or evaluation.get('title')
                    or evaluation['violation_type'],
                    status=spec['fine_status'],
                    location=spec['location'],
                    vehicle_plate=spec['vehicle'].plate_number,
                    due_date=due,
                    officer_note=spec['note'],
                    payment_method='khqr' if paid else '',
                    payment_reference=f'KHQR-PP-{spec["days_ago"]:03d}9540' if paid else '',
                    paid_at=(timezone.now() - timedelta(days=max(spec['days_ago'] - 3, 1))) if paid else None,
                )
                created_f += 1
                print('  created fine', amount, spec['fine_status'])
            elif fine:
                print('  fine exists', fine.status)

            if spec.get('appeal') and fine:
                appeal = ViolationAppeal.objects.filter(driver=driver, violation=v).first()
                if not appeal:
                    appeal = ViolationAppeal.objects.create(
                        violation=v,
                        fine=fine,
                        driver=driver,
                        reason=spec.get('appeal_reason') or 'Requesting review of this fine.',
                        status=spec.get('appeal_status') or 'pending',
                        reviewed_by=officer.user if officer and spec.get('appeal_status') != 'pending' else None,
                        review_date=(
                            timezone.now() - timedelta(days=max(spec['days_ago'] - 2, 1))
                            if spec.get('appeal_status') != 'pending'
                            else None
                        ),
                        officer_comments=(
                            'Appeal reviewed against camera evidence.'
                            if spec.get('appeal_status') != 'pending'
                            else ''
                        ),
                    )
                    created_a += 1
                    print('  created appeal', appeal.status)
                else:
                    print('  appeal exists', appeal.status)

        notifications = [
            (
                'Welcome to CamTraffic',
                'Your driver profile is verified. View vehicles, fines, and AI detections in the citizen portal.',
                'system',
            ),
            (
                'New fine issued',
                'A pending fine was issued for illegal parking on Monivong Blvd, Phnom Penh. Please review and pay.',
                'fine',
            ),
            (
                'Appeal received',
                'Your No Entry appeal on Street 51 is pending officer review.',
                'alert',
            ),
            (
                'Payment confirmed',
                f'KHQR payment received for plate {CAR_PLATE}. Thank you for settling your fine.',
                'payment',
            ),
        ]
        created_n = 0
        for title, message, ntype in notifications:
            if Notification.objects.filter(user=user, title=title).exists():
                continue
            Notification.objects.create(user=user, title=title, message=message, type=ntype)
            created_n += 1

        print('DONE')
        print('user', user.email, user.full_name, user.phone, user.license_no)
        print('address', user.address)
        print(
            'driver',
            driver.license_no,
            driver.national_id,
            driver.date_of_birth,
            driver.license_expiry,
            'points=',
            driver.demerit_points,
            'kyc=',
            driver.kyc_status,
        )
        print(
            'vehicles',
            list(Vehicle.objects.filter(owner=user).values_list('plate_number', 'make', 'model', 'year')),
        )
        print('violations', TrafficViolation.objects.filter(driver=driver).count(), 'new=', created_v)
        print('fines', Fine.objects.filter(driver=user).count(), 'new=', created_f)
        print('appeals', ViolationAppeal.objects.filter(driver=driver).count(), 'new=', created_a)
        print('notifications', Notification.objects.filter(user=user).count(), 'new=', created_n)


if __name__ == '__main__':
    run()
