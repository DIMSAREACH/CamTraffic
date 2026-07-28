"""
Management command for payment reconciliation and settlement verification.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
import json

from fines.services.payment_settlement import payment_settlement


class Command(BaseCommand):
    help = 'Reconcile payments and verify settlements'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date-from',
            type=str,
            help='Start date for reconciliation (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--date-to', 
            type=str,
            help='End date for reconciliation (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--days-back',
            type=int,
            default=1,
            help='Number of days back to reconcile (default: 1)',
        )
        parser.add_argument(
            '--output-json',
            type=str,
            help='Save reconciliation report to JSON file',
        )
        parser.add_argument(
            '--show-details',
            action='store_true',
            help='Show detailed payment information',
        )

    def handle(self, *args, **options):
        """Run payment reconciliation for specified date range."""
        
        # Determine date range
        if options['date_from'] and options['date_to']:
            date_from = datetime.strptime(options['date_from'], '%Y-%m-%d')
            date_to = datetime.strptime(options['date_to'], '%Y-%m-%d')
        else:
            # Default to yesterday if no dates specified
            days_back = options['days_back']
            date_to = timezone.now().replace(hour=23, minute=59, second=59)
            date_from = date_to - timedelta(days=days_back)
        
        # Make timezone aware
        if timezone.is_naive(date_from):
            date_from = timezone.make_aware(date_from)
        if timezone.is_naive(date_to):
            date_to = timezone.make_aware(date_to)
        
        self.stdout.write(f'🔍 Reconciling payments from {date_from.date()} to {date_to.date()}')
        
        # Run reconciliation
        try:
            result = payment_settlement.reconcile_payments(date_from, date_to)
            
            if 'error' in result:
                self.stdout.write(self.style.ERROR(f'❌ Reconciliation failed: {result["error"]}'))
                return
            
            # Display results
            self.display_reconciliation_results(result, options['show_details'])
            
            # Save to file if requested
            if options['output_json']:
                with open(options['output_json'], 'w') as f:
                    json.dump(result, f, indent=2)
                self.stdout.write(f'💾 Report saved to {options["output_json"]}')
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error during reconciliation: {e}'))

    def display_reconciliation_results(self, result, show_details=False):
        """Display reconciliation results in a formatted way."""
        
        summary = result['summary']
        
        self.stdout.write('\n📊 Payment Reconciliation Report')
        self.stdout.write('=' * 40)
        
        # Overall summary
        self.stdout.write(f'📅 Period: {result["date_range"]["from"][:10]} to {result["date_range"]["to"][:10]}')
        self.stdout.write(f'💰 Total Amount: ${summary["total_amount"]:.2f}')
        self.stdout.write(f'📝 Total Payments: {summary["total_payments"]}')
        
        # Automation metrics
        automated = result['automated_settlements']
        manual = result['manual_verifications']
        automation_rate = (automated / (automated + manual) * 100) if (automated + manual) > 0 else 0
        
        self.stdout.write(f'\n🤖 Automation Metrics:')
        self.stdout.write(f'  ✅ Automated settlements: {automated}')
        self.stdout.write(f'  👤 Manual verifications: {manual}')
        self.stdout.write(f'  📈 Automation rate: {automation_rate:.1f}%')
        
        # Payment methods breakdown
        if summary['by_method']:
            self.stdout.write(f'\n💳 Payment Methods:')
            for method, data in summary['by_method'].items():
                percentage = (data['amount'] / summary['total_amount'] * 100) if summary['total_amount'] > 0 else 0
                self.stdout.write(f'  {method.upper()}: {data["count"]} payments, ${data["amount"]:.2f} ({percentage:.1f}%)')
        
        # Discrepancies
        if result.get('discrepancies'):
            self.stdout.write(f'\n⚠️  Discrepancies Found: {len(result["discrepancies"])}')
            for disc in result['discrepancies']:
                self.stdout.write(f'  - {disc}')
        else:
            self.stdout.write(f'\n✅ No discrepancies found')
        
        # Status assessment
        if automation_rate >= 80:
            self.stdout.write(self.style.SUCCESS(f'\n🎉 Excellent automation rate: {automation_rate:.1f}%'))
        elif automation_rate >= 50:
            self.stdout.write(self.style.WARNING(f'\n⚡ Good automation rate: {automation_rate:.1f}%'))
        else:
            self.stdout.write(self.style.ERROR(f'\n📈 Consider improving automation: {automation_rate:.1f}%'))
        
        if show_details:
            self.display_settlement_status()
    
    def display_settlement_status(self):
        """Display current settlement system status."""
        
        self.stdout.write(f'\n🔧 Settlement System Status:')
        self.stdout.write('-' * 30)
        
        try:
            status = payment_settlement.get_settlement_status()
            
            # Payment methods
            methods = status['payment_methods']
            for method, config in methods.items():
                enabled_emoji = '✅' if config['enabled'] else '❌'
                auto_emoji = '🤖' if config.get('automated_settlement', False) else '👤'
                
                self.stdout.write(f'{enabled_emoji} {method.upper()}: {auto_emoji}')
                if not config['enabled']:
                    self.stdout.write(f'   (Not configured)')
                elif config.get('automated_settlement'):
                    self.stdout.write(f'   (Automated settlement enabled)')
                else:
                    self.stdout.write(f'   (Manual verification required)')
            
            # Features
            features = status['settlement_features']
            self.stdout.write(f'\n🚀 Features:')
            self.stdout.write(f'  Automated webhooks: {"✅" if features["automated_webhooks"] else "❌"}')
            self.stdout.write(f'  Real-time settlement: {"✅" if features["real_time_settlement"] else "❌"}')
            self.stdout.write(f'  Reconciliation reports: {"✅" if features["reconciliation_reports"] else "❌"}')
            self.stdout.write(f'  Dispute handling: {"✅" if features["dispute_handling"] else "❌"}')
            
            # Overall status
            config_status = status['configuration_status']
            if config_status['production_ready']:
                self.stdout.write(self.style.SUCCESS(f'\n✅ System is production-ready'))
            else:
                self.stdout.write(self.style.WARNING(f'\n⚠️  Demo fallback mode active'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Could not retrieve settlement status: {e}'))