"""
Normalize fine.amount to realistic USD values (UI shows KHR = amount × 4100).

Bug: some seed/update scripts stored KHR-like integers (5000–200000) in the USD field,
which then displayed as millions of riel (e.g. 15000 → KHR 61,500,000).
"""
from decimal import Decimal
import random

from django.core.management.base import BaseCommand
from django.db.models import Avg, Max, Min, Sum

from fines.models import Fine

# Stored in USD. Display ≈ amount × 4100 KHR.
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

DEFAULT_USD = [8, 10, 12, 15, 20]


def pick_usd(reason: str) -> Decimal:
    lower = (reason or '').lower()
    for keyword, choices in REALISTIC_USD_BY_KEYWORD.items():
        if keyword in lower:
            return Decimal(str(random.choice(choices)))
    return Decimal(str(random.choice(DEFAULT_USD)))


class Command(BaseCommand):
    help = 'Fix inflated fine amounts: store realistic USD (UI ×4100 → reasonable KHR)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would change without saving',
        )

    def handle(self, *args, **options):
        dry = options['dry_run']
        self.stdout.write(self.style.NOTICE(
            '\nFixing fine amounts → realistic USD (display KHR = USD × 4100)\n'
        ))

        fines = Fine.objects.all().order_by('-created_at')
        updated = 0

        for fine in fines:
            old = Decimal(str(fine.amount))
            # Already in a sane USD band for traffic fines (< $150)
            if Decimal('1') <= old <= Decimal('150'):
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
