"""
Update existing violations with diverse, realistic Cambodian data.
Changes drivers, vehicles, violation types, and locations to be more varied.
"""
import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from violations.models import TrafficViolation


class Command(BaseCommand):
    help = 'Update existing violations with diverse Cambodian data'

    def handle(self, *args, **options):
        violations = list(TrafficViolation.objects.all()[:200])
        
        if not violations:
            self.stdout.write(self.style.WARNING('No violations found to update!'))
            return

        self.stdout.write(f'📝 Updating {len(violations)} violations with diverse Cambodian data...')

        # Cambodian names
        names = [
            'Sok Chantha', 'Chea Sokha', 'Pich Sothea', 'Heng Dara', 'Hor Sophea',
            'Kong Rattana', 'Lim Bopha', 'Meas Kunthea', 'Nhem Sreypov', 'Ouk Chanthy',
            'Prak Piseth', 'Ros Virak', 'Sao Samnang', 'Tep Sophal', 'Ung Kimheng',
            'Vong Phirun', 'Yem Sokchea', 'Khiev Bunrith', 'Leng Socheat', 'Men Veasna',
            'Nou Chandara', 'Seng Rithy', 'Touch Sovann', 'Van Panha', 'Yen Raksa',
        ]

        # Violation scenarios
        scenarios = [
            {
                'type': 'NO_PARKING',
                'title': 'No Parking Violation',
                'locations': ['Sisowath Quay, Riverside', 'Street 51, Central Market', 'Street 240, Russian Market', 'Charles de Gaulle Blvd', 'Monivong Blvd junction'],
                'desc': 'Parked in a no-parking zone',
                'fine': Decimal('50.00'),
            },
            {
                'type': 'NO_ENTRY',
                'title': 'No Entry Violation',
                'locations': ['Street 178, one-way', 'Monivong Blvd restricted zone', 'Street 271, BKK area', 'Norodom Blvd junction', 'Street 51 restricted'],
                'desc': 'Entered restricted area or wrong-way street',
                'fine': Decimal('100.00'),
            },
            {
                'type': 'ILLEGAL_LEFT_TURN',
                'title': 'Illegal Left Turn',
                'locations': ['Monivong & Mao Tse Toung', 'Norodom & St 240 junction', 'Charles de Gaulle intersection', 'Russian Blvd junction', 'Street 271 crossing'],
                'desc': 'Made a left turn where prohibited',
                'fine': Decimal('75.00'),
            },
            {
                'type': 'ILLEGAL_RIGHT_TURN',
                'title': 'Illegal Right Turn',
                'locations': ['Preah Sihanouk Blvd junction', 'Street 51 intersection', 'Riverside junction', 'Hun Sen Blvd crossing', 'Olympic Stadium area'],
                'desc': 'Made a right turn where prohibited',
                'fine': Decimal('75.00'),
            },
            {
                'type': 'ILLEGAL_U_TURN',
                'title': 'Illegal U-Turn',
                'locations': ['Monivong Blvd', 'Norodom Blvd', 'Hun Sen Blvd', 'Russian Federation Blvd', 'Samdach Sothearos Blvd'],
                'desc': 'Made a U-turn where prohibited',
                'fine': Decimal('80.00'),
            },
            {
                'type': 'NO_STOPPING',
                'title': 'No Stopping Violation',
                'locations': ['Monivong Bridge approach', 'Japanese Bridge', 'Independence Monument circle', 'Street 240', 'Wat Phnom area'],
                'desc': 'Stopped vehicle in a no-stopping zone',
                'fine': Decimal('60.00'),
            },
            {
                'type': 'WEIGHT_LIMIT_VIOLATION',
                'title': 'Weight Limit Exceeded',
                'locations': ['National Road 1', 'National Road 4', 'National Road 5', 'Chroy Changvar Bridge', 'National Road 2'],
                'desc': 'Vehicle exceeded posted weight limit',
                'fine': Decimal('200.00'),
            },
        ]

        # Status distribution: 40% confirmed, 30% pending, 20% rejected, 10% draft
        statuses = ['confirmed'] * 40 + ['pending_review'] * 30 + ['rejected'] * 20 + ['draft'] * 10

        updated_count = 0
        for violation in violations:
            try:
                scenario = random.choice(scenarios)
                location = random.choice(scenario['locations'])
                
                # Random recent date
                days_ago = random.randint(0, 60)
                hours = random.randint(6, 22)
                minutes = random.randint(0, 59)
                new_datetime = timezone.now() - timedelta(days=days_ago, hours=hours, minutes=minutes)
                
                # Update violation
                violation.violation_type = scenario['type']
                violation.location = location
                violation.latitude = 11.5564 + random.uniform(-0.05, 0.05)
                violation.longitude = 104.9282 + random.uniform(-0.05, 0.05)
                violation.datetime = new_datetime
                violation.status = random.choice(statuses)
                violation.description = scenario['desc']
                violation.fine_amount = scenario['fine']
                
                # Update driver name if exists
                if violation.driver and violation.driver.user:
                    violation.driver.user.full_name = random.choice(names)
                    violation.driver.user.save()
                
                violation.save()
                updated_count += 1

                if updated_count % 50 == 0:
                    self.stdout.write(f'  ✓ Updated {updated_count}/{len(violations)} violations...')

            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  ⚠️  Failed to update violation {violation.id}: {e}'))

        self.stdout.write(self.style.SUCCESS(f'\n✅ Successfully updated {updated_count} violations with diverse Cambodian data!'))
        self.stdout.write(self.style.SUCCESS(f'   • Different violation types: NO_PARKING, NO_ENTRY, ILLEGAL_TURN, WEIGHT_LIMIT, etc.'))
        self.stdout.write(self.style.SUCCESS(f'   • Varied locations across Phnom Penh'))
        self.stdout.write(self.style.SUCCESS(f'   • Diverse Cambodian driver names'))
        self.stdout.write(self.style.SUCCESS(f'   • Mixed statuses: confirmed, pending, rejected, draft'))
