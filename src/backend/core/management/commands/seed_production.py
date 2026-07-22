"""Seed production-truth demo data: accounts, RBAC, signs, cameras, fines, violations."""
from django.core.management import call_command
from django.core.management.base import BaseCommand

from infrastructure.models import Camera


class Command(BaseCommand):
    help = (
        'Prepare a production-truth database: demo accounts, RBAC alignment, '
        'traffic signs, sample fines, and camera feeds (no frontend mock data required).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset-passwords',
            action='store_true',
            help='Reset demo account passwords to the default from seed_demo',
        )
        parser.add_argument(
            '--skip-cameras',
            action='store_true',
            help='Do not seed camera/road demo feeds',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('CamTraffic — production truth seed'))

        call_command('seed_demo', reset_passwords=options['reset_passwords'])
        call_command('backfill_erd_alignment')

        if not options['skip_cameras'] and Camera.objects.count() == 0:
            call_command('seed_cameras')
        elif Camera.objects.count() == 0:
            self.stdout.write(self.style.WARNING('  No cameras — run: python manage.py seed_cameras'))
        else:
            self.stdout.write(self.style.SUCCESS(f'  Cameras: {Camera.objects.count()}'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Production-truth seed complete.'))
        self.stdout.write('  Frontends: VITE_USE_MOCK=false, VITE_USE_SAMPLE_FALLBACK=false')
        self.stdout.write('  Run: npm run dev  (with backend on :8000)')
        self.stdout.write('  Accounts: docs/final-year-project/DEMO-ACCOUNTS.md')
