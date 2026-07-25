"""Upload local MEDIA_ROOT files into the configured S3/R2 default storage."""
from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Copy files from local MEDIA_ROOT into S3/R2 (USE_S3_MEDIA=True).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='List files that would be uploaded without writing.',
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            default=True,
            help='Skip keys that already exist in cloud storage (default).',
        )
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Re-upload even if the key already exists.',
        )

    def handle(self, *args, **options):
        if not getattr(settings, 'USE_S3_MEDIA', False):
            raise CommandError('Set USE_S3_MEDIA=True and AWS_* credentials before syncing.')

        root = Path(settings.MEDIA_ROOT)
        if not root.is_dir():
            raise CommandError(f'MEDIA_ROOT not found: {root}')

        dry_run = options['dry_run']
        skip_existing = not options['overwrite']
        uploaded = skipped = errors = 0

        for path in sorted(root.rglob('*')):
            if not path.is_file():
                continue
            rel = path.relative_to(root).as_posix()
            try:
                if skip_existing and default_storage.exists(rel):
                    skipped += 1
                    self.stdout.write(f'skip  {rel}')
                    continue
                if dry_run:
                    self.stdout.write(f'would {rel}')
                    uploaded += 1
                    continue
                with path.open('rb') as fh:
                    default_storage.save(rel, fh)
                uploaded += 1
                self.stdout.write(self.style.SUCCESS(f'ok    {rel}'))
            except Exception as exc:  # noqa: BLE001 — report and continue
                errors += 1
                self.stderr.write(self.style.ERROR(f'fail  {rel}: {exc}'))

        self.stdout.write(
            self.style.NOTICE(
                f'Done: uploaded={uploaded} skipped={skipped} errors={errors} dry_run={dry_run}'
            )
        )
