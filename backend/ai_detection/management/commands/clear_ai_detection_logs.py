from django.core.management.base import BaseCommand

from ai_detection.models import AIDetectionLog


class Command(BaseCommand):
    help = 'Delete all AI detection log records (clears recent detections on the AI Detection page)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print how many rows would be deleted without deleting',
        )

    def handle(self, *args, **options):
        count = AIDetectionLog.objects.count()
        if options['dry_run']:
            self.stdout.write(f'Would delete {count} AI detection log(s).')
            return
        deleted, _ = AIDetectionLog.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {deleted} AI detection log(s).'))
