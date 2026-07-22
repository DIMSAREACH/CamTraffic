"""Restore CamTraffic from a system backup ZIP."""
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from core.backup_service import restore_system_backup


class Command(BaseCommand):
    help = 'Restore system from a backup ZIP (overwrites database and media)'

    def add_arguments(self, parser):
        parser.add_argument('backup_file', type=str, help='Path to camtraffic-backup-*.zip')
        parser.add_argument(
            '--no-media',
            action='store_true',
            help='Skip restoring uploaded media files',
        )
        parser.add_argument(
            '--yes',
            action='store_true',
            help='Skip confirmation prompt',
        )

    def handle(self, *args, **options):
        path = Path(options['backup_file'])
        if not path.exists():
            raise CommandError(f'Backup not found: {path}')

        if not options['yes']:
            confirm = input('This will overwrite the live database and media. Type RESTORE to continue: ')
            if confirm.strip() != 'RESTORE':
                self.stdout.write('Restore cancelled.')
                return

        try:
            result = restore_system_backup(
                path,
                restore_media=not options['no_media'],
                restore_database=True,
            )
        except Exception as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(self.style.SUCCESS('Restore completed.'))
        self.stdout.write(f'  Restored: {", ".join(result["restored"])}')
