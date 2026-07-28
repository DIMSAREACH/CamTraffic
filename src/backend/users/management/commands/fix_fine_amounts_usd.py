"""
Normalize `fines.Fine.amount` to realistic USD values.

The frontend stores fine amounts in USD and displays Khmer Riel as:
  displayed_KHR = amount_USD × 4100

Some seeds stored KHR-like *thousands* (e.g. `5` meaning `5,000 KHR`) directly
into the USD field. This command fixes that by interpreting schedule values
as KHR-thousands and converting them to USD:
  amount_USD = (KHR_thousands × 1000) / 4100
"""
from decimal import Decimal
import random

from django.core.management.base import BaseCommand
from django.db.models import Avg, Max, Min, Sum

from fines.models import Fine

# Schedule values below are KHR-thousands (not USD).
#
# Example: `helmet: [4,5,8,10]` means 4,000–10,000 KHR.
REALISTIC_USD_BY_KEYWORD = {
    'helmet': [5, 8, 10],
    'speed': [15, 20, 25],
    'school': [20, 25],
    'parking': [5, 10, 15, 20],
    'wrong-way': [15, 20, 25],
    'wrong way': [15, 20, 25],
    'mobile': [10, 15, 20],
    'phone': [10, 15, 20],
    'red light': [20, 30, 40],
    'seatbelt': [5, 8, 10],
    'seat belt': [5, 8, 10],
    'stop sign': [10, 15, 20],
    'turn': [10, 12, 15],
    'registration': [20, 30, 40],
    'reckless': [40, 50],
    'drunk': [50, 80, 100],
    'dui': [50, 80, 100],
    'emergency': [25, 30, 40],
}

DEFAULT_USD = [8, 10, 12, 15, 20]  # KHR-thousands

USD_TO_KHR = Decimal('4100')


def pick_usd(reason: str) -> Decimal:
    lower = (reason or '').lower()
    for keyword, choices in REALISTIC_USD_BY_KEYWORD.items():
        if keyword in lower:
            khr_thousands = Decimal(str(random.choice(choices)))
            return (khr_thousands * Decimal('1000')) / USD_TO_KHR
    khr_thousands = Decimal(str(random.choice(DEFAULT_USD)))
    return (khr_thousands * Decimal('1000')) / USD_TO_KHR


class Command(BaseCommand):
    help = 'Fix inflated fine amounts: store realistic USD (UI ×4100 → reasonable KHR)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would change without saving',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Re-apply normalization even if amounts already look sane',
        )

    def handle(self, *args, **options):
        dry = options['dry_run']
        force = options['force']
        self.stdout.write(self.style.NOTICE(
            '\nFixing fine amounts → realistic USD (display KHR = USD × 4100)\n'
        ))

        fines = Fine.objects.all().order_by('-created_at')
        updated = 0

        for fine in fines:
            old = Decimal(str(fine.amount))
            # Already in a sane USD band for traffic fines (< $150)
            if (not force) and (Decimal('0.5') <= old <= Decimal('30')):
                continue

            new_amount = pick_usd(fine.reason)
            updated += 1
            self.stdout.write(
                f'  {old:>12} USD (~KHR {int(old * 4100):,})'
                f' → {new_amount:>6} USD (~KHR {int(new_amount * 4100):,})'
                f' | {fine.reason[:40]}'
            )
            if not dry:
                fine.amount = new_amount
                fine.save(update_fields=['amount'])

        if dry:
            self.stdout.write(self.style.WARNING(f'\nDry run: {updated} fines would be updated'))
            return

        stats = Fine.objects.aggregate(
            total=Sum('amount'),
            avg=Avg('amount'),
            min=Min('amount'),
            max=Max('amount'),
        )
        self.stdout.write(self.style.SUCCESS(f'\nUpdated {updated} inflated fines'))
        if stats['total'] is not None:
            self.stdout.write(
                f'  Avg ${stats["avg"]:.2f} USD (~KHR {int(stats["avg"] * 4100):,})'
                f' | Min ${stats["min"]:.2f} | Max ${stats["max"]:.2f}'
            )
        self.stdout.write(self.style.SUCCESS('Done — refresh the fines page.\n'))
