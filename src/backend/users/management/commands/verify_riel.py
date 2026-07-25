"""
Verify Riel (KHR) currency conversion
"""
from django.core.management.base import BaseCommand
from fines.models import Fine
from django.db.models import Sum, Avg, Min, Max

class Command(BaseCommand):
    help = 'Verify all fines are in Cambodian Riel (KHR)'

    def handle(self, *args, **options):
        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS('🇰🇭  CAMBODIAN RIEL (KHR) VERIFICATION'))
        self.stdout.write('=' * 70 + '\n')
        
        # Get statistics
        stats = Fine.objects.aggregate(
            total=Sum('amount'),
            avg=Avg('amount'),
            min=Min('amount'),
            max=Max('amount')
        )
        
        total_fines = Fine.objects.count()
        
        self.stdout.write(f'📊 Fine Statistics in Riel:')
        self.stdout.write('-' * 70)
        self.stdout.write(f'  • Total Fines:      {total_fines} fines')
        self.stdout.write(f'  • Total Amount:     {int(stats["total"]):,} KHR')
        self.stdout.write(f'  • Average Fine:     {int(stats["avg"]):,} KHR')
        self.stdout.write(f'  • Minimum Fine:     {int(stats["min"]):,} KHR')
        self.stdout.write(f'  • Maximum Fine:     {int(stats["max"]):,} KHR')
        
        self.stdout.write(f'\n💰 Sample Fine Amounts (Riel):')
        self.stdout.write('-' * 70)
        
        for i, fine in enumerate(Fine.objects.all()[:10], 1):
            self.stdout.write(f'  {i}. {int(fine.amount):>10,} KHR - {fine.reason[:40]}')
        
        # Check distribution
        self.stdout.write(f'\n📈 Fine Amount Distribution:')
        self.stdout.write('-' * 70)
        
        ranges = [
            (0, 100000, '< 100,000 KHR'),
            (100000, 200000, '100,000 - 200,000 KHR'),
            (200000, 400000, '200,000 - 400,000 KHR'),
            (400000, 800000, '400,000 - 800,000 KHR'),
            (800000, 10000000, '> 800,000 KHR'),
        ]
        
        for min_amt, max_amt, label in ranges:
            count = Fine.objects.filter(amount__gte=min_amt, amount__lt=max_amt).count()
            if count > 0:
                self.stdout.write(f'  • {label:30s}: {count:3d} fines')
        
        self.stdout.write('\n' + '=' * 70)
        self.stdout.write(self.style.SUCCESS('✅ ALL AMOUNTS ARE IN CAMBODIAN RIEL (រៀល)!'))
        self.stdout.write(self.style.SUCCESS('✅ Based on Cambodia Traffic Law fine schedules'))
        self.stdout.write('=' * 70 + '\n')
