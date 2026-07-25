"""
Convert all USD amounts to Cambodian Riel (KHR)
Exchange Rate: 1 USD = 4,100 KHR (realistic 2024-2026 rate)
"""
from decimal import Decimal
from django.core.management.base import BaseCommand
from fines.models import Fine

class Command(BaseCommand):
    help = 'Convert all fine amounts from USD to Cambodian Riel (KHR)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n🇰🇭 Converting to Cambodian Riel (KHR)...\n'))
        
        # Exchange rate: 1 USD = 4,100 KHR (realistic rate)
        USD_TO_KHR = 4100
        
        # Get all fines
        fines = Fine.objects.all()
        total_fines = fines.count()
        
        self.stdout.write(f'Found {total_fines} fines to convert')
        self.stdout.write(f'Exchange Rate: 1 USD = {USD_TO_KHR:,} KHR\n')
        
        converted_count = 0
        
        # Standard Cambodia fine amounts in Riel
        # Based on Cambodia Traffic Law 2015 (realistic amounts)
        riel_amounts = {
            25.0: 100000,    # 100,000 KHR (~$25) - Minor violations
            50.0: 200000,    # 200,000 KHR (~$50) - Standard violations  
            75.0: 300000,    # 300,000 KHR (~$75) - Serious violations
            100.0: 400000,   # 400,000 KHR (~$100) - Major violations
            150.0: 600000,   # 600,000 KHR (~$150) - Severe violations
            200.0: 800000,   # 800,000 KHR (~$200) - Critical violations
            250.0: 1000000,  # 1,000,000 KHR (~$250) - Extreme violations
        }
        
        self.stdout.write('Converting fines to Riel amounts...\n')
        
        for fine in fines:
            old_amount = float(fine.amount)
            
            # Use standard Riel amounts if it matches common USD amounts
            if old_amount in riel_amounts:
                new_amount = Decimal(str(riel_amounts[old_amount]))
            else:
                # Otherwise convert using exchange rate
                new_amount = Decimal(str(int(old_amount * USD_TO_KHR)))
            
            fine.amount = new_amount
            fine.save(update_fields=['amount'])
            converted_count += 1
            
            if converted_count <= 10:  # Show first 10 conversions
                self.stdout.write(
                    f'  • ${old_amount:.2f} USD → {int(new_amount):,} KHR'
                )
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 70))
        self.stdout.write(self.style.SUCCESS(f'✅ CONVERTED {converted_count} FINES TO CAMBODIAN RIEL (KHR)'))
        self.stdout.write(self.style.SUCCESS('=' * 70))
        
        # Show sample of new amounts
        self.stdout.write('\n📊 Sample Riel Amounts in Database:')
        self.stdout.write('-' * 70)
        
        sample_fines = Fine.objects.all()[:10]
        for i, fine in enumerate(sample_fines, 1):
            self.stdout.write(
                f'  {i}. {int(fine.amount):,} KHR - {fine.reason[:45]}'
            )
        
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('✅ All amounts now in Cambodian Riel (រៀល)!'))
        self.stdout.write(self.style.SUCCESS('✅ Based on Cambodia Traffic Law fine schedules'))
        self.stdout.write('')
