"""
Update to REAL Cambodia traffic fine amounts (USD storage).

Amounts are stored in USD; the UI displays KHR as amount × 4100.
Do NOT store KHR integers here — that inflates display to millions of riel.
"""
from decimal import Decimal
import random
from django.core.management.base import BaseCommand
from django.db.models import Avg, Max, Min, Sum
from fines.models import Fine


class Command(BaseCommand):
    help = 'Update fines to realistic Cambodia USD amounts (UI shows KHR ×4100)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\nUpdating fines to realistic Cambodia USD amounts...\n'))

        # USD values → display ≈ ×4100 KHR (e.g. $20 → KHR 82,000)
        real_cambodia_fines_usd = {
            'No helmet (motorcycle)': [5, 8, 10],
            'Speeding above limit': [15, 20, 25],
            'Illegal parking': [5, 10, 15, 20],
            'Wrong-way driving': [15, 20, 25],
            'Using mobile phone while driving': [10, 15, 20],
            'Running red light': [20, 30, 40],
            'No seatbelt': [5, 8, 10],
            'Failure to stop at stop sign': [10, 15, 20],
            'Illegal turn': [10, 12, 15],
            'No vehicle registration': [20, 30, 40],
            'Reckless driving': [40, 50],
            'Drunk driving (DUI)': [50, 80, 100],
            'Blocking emergency lane': [25, 30, 40],
            'Speeding in school zone': [20, 25],
        }

        violation_mapping = {
            'helmet': 'No helmet (motorcycle)',
            'school': 'Speeding in school zone',
            'speed': 'Speeding above limit',
            'parking': 'Illegal parking',
            'wrong-way': 'Wrong-way driving',
            'wrong way': 'Wrong-way driving',
            'mobile': 'Using mobile phone while driving',
            'phone': 'Using mobile phone while driving',
            'red light': 'Running red light',
            'seatbelt': 'No seatbelt',
            'seat belt': 'No seatbelt',
            'stop sign': 'Failure to stop at stop sign',
            'turn': 'Illegal turn',
            'registration': 'No vehicle registration',
            'reckless': 'Reckless driving',
            'drunk': 'Drunk driving (DUI)',
            'dui': 'Drunk driving (DUI)',
            'emergency': 'Blocking emergency lane',
        }

        fines = Fine.objects.all()
        updated_count = 0

        for fine in fines:
            old_amount = fine.amount
            reason_lower = fine.reason.lower()

            matched_violation = None
            for keyword, violation_type in violation_mapping.items():
                if keyword in reason_lower:
                    matched_violation = violation_type
                    break

            if matched_violation and matched_violation in real_cambodia_fines_usd:
                new_amount = Decimal(str(random.choice(real_cambodia_fines_usd[matched_violation])))
            else:
                new_amount = Decimal(str(random.choice([8, 10, 12, 15, 20])))

            fine.amount = new_amount
            fine.save(update_fields=['amount'])
            updated_count += 1

            if updated_count <= 15:
                self.stdout.write(
                    f'  ${old_amount} → ${new_amount} USD '
                    f'(~KHR {int(new_amount * 4100):,}) | {fine.reason[:40]}'
                )

        stats = Fine.objects.aggregate(
            total=Sum('amount'),
            avg=Avg('amount'),
            min=Min('amount'),
            max=Max('amount'),
        )

        self.stdout.write(self.style.SUCCESS(f'\nUpdated {updated_count} fines'))
        self.stdout.write(
            f'  Avg ${stats["avg"]:.2f} (~KHR {int(stats["avg"] * 4100):,})'
            f' | Max ${stats["max"]:.2f} (~KHR {int(stats["max"] * 4100):,})'
        )
        self.stdout.write(self.style.SUCCESS('Refresh the fines page to see realistic amounts.\n'))
