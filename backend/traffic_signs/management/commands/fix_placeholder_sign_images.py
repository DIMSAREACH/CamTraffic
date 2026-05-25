"""Remove green-circle placeholder files so signs can be re-imported or re-uploaded."""
from pathlib import Path

from django.core.management.base import BaseCommand

from traffic_signs.models import TrafficSign
from traffic_signs.sign_image_utils import is_placeholder_sign_image


class Command(BaseCommand):
    help = 'Clear placeholder sign images (green circle on black) from the catalog'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='List affected signs without changing the database',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        cleared = 0
        for sign in TrafficSign.objects.exclude(image='').exclude(image__isnull=True):
            path = Path(sign.image.path) if sign.image else None
            if not path or not path.is_file():
                continue
            if not is_placeholder_sign_image(path):
                continue
            self.stdout.write(f'  placeholder: {sign.sign_code} ({path.name})')
            if dry_run:
                cleared += 1
                continue
            path.unlink(missing_ok=True)
            sign.image = None
            sign.save(update_fields=['image'])
            cleared += 1

        verb = 'Would clear' if dry_run else 'Cleared'
        self.stdout.write(self.style.SUCCESS(f'{verb} {cleared} placeholder image(s)'))
