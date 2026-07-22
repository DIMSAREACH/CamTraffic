"""Create a full CamTraffic system backup ZIP."""
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from core.backup_service import create_system_backup


class Command(BaseCommand):
    help = 'Create a full system backup (database, media, fixtures, optional AI weights)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default='',
            help='Output directory (default: backend/backups/)',
        )
        parser.add_argument(
            '--include-weights',
            action='store_true',
            help='Include AI model weights (.pt files) in the archive',
        )
        parser.add_argument(
            '--no-store',
            action='store_true',
            help='Do not keep a copy in the backups folder after creation',
        )

    def handle(self, *args, **options):
        output_dir = Path(options['output']) if options['output'] else None
        try:
            path, manifest = create_system_backup(
                include_weights=options['include_weights'],
                store_copy=not options['no_store'],
                output_dir=output_dir,
            )
        except Exception as exc:
            raise CommandError(str(exc)) from exc

        size_mb = manifest['size_bytes'] / (1024 * 1024)
        self.stdout.write(self.style.SUCCESS(f'Backup created: {path}'))
        self.stdout.write(f'  Size: {size_mb:.2f} MB')
        self.stdout.write(f'  Components: {", ".join(manifest["components"])}')
