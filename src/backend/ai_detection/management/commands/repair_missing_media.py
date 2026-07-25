"""Restore missing AI/evidence media files referenced by the database."""
from __future__ import annotations

import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from ai_detection.models import AIDetectionLog
from appeals.models import ViolationAppeal
from fines.models import Fine
from violations.models import TrafficViolation


class Command(BaseCommand):
    help = (
        'Repair broken /media/ai/... references by copying demo camera frames '
        'into the expected paths (fixes Vite 404s for missing evidence).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Report missing files without writing',
        )
        parser.add_argument(
            '--clear-missing',
            action='store_true',
            help='Clear ImageField values when files are missing (instead of restoring)',
        )

    def handle(self, *args, **options):
        media_root = Path(settings.MEDIA_ROOT)
        source = self._pick_source(media_root)
        if source is None:
            self.stdout.write(self.style.ERROR(
                'No demo JPEG found under MEDIA_ROOT/demo-cameras or admin public demo-cameras.'
            ))
            return

        self.stdout.write(f'Source frame: {source}')
        dry = options['dry_run']
        clear = options['clear_missing']

        targets = [
            (AIDetectionLog, ('uploaded_image', 'vehicle_snapshot', 'plate_snapshot', 'processed_image')),
            (TrafficViolation, ('vehicle_evidence_image', 'plate_evidence_image')),
            (Fine, ('evidence_image', 'payment_screenshot')),
        ]

        restored = cleared = missing = 0
        for model, fields in targets:
            # Only include fields that exist on the model
            real_fields = [f for f in fields if hasattr(model, f)]
            if not real_fields:
                continue
            qs = model.objects.all()
            for obj in qs.iterator():
                update_fields = []
                for field in real_fields:
                    file_field = getattr(obj, field, None)
                    if not file_field:
                        continue
                    rel = str(file_field)
                    if not rel.strip():
                        continue
                    dest = media_root / rel
                    if dest.exists() and dest.stat().st_size >= 8_000:
                        continue
                    missing += 1
                    if dry:
                        self.stdout.write(f'  MISSING {model.__name__}.{field}: {rel}')
                        continue
                    if clear:
                        setattr(obj, field, None)
                        update_fields.append(field)
                        cleared += 1
                        continue
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source, dest)
                    restored += 1
                if update_fields:
                    obj.save(update_fields=update_fields)

        # Appeals evidence if present
        if hasattr(ViolationAppeal, 'evidence_image'):
            for obj in ViolationAppeal.objects.exclude(evidence_image='').iterator():
                rel = str(obj.evidence_image or '')
                if not rel:
                    continue
                dest = media_root / rel
                if dest.exists():
                    continue
                missing += 1
                if dry:
                    self.stdout.write(f'  MISSING Appeal.evidence_image: {rel}')
                elif clear:
                    obj.evidence_image = None
                    obj.save(update_fields=['evidence_image'])
                    cleared += 1
                else:
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source, dest)
                    restored += 1

        # Also restore any orphan path strings from recent detections that UI still requests
        # (paths may be absolute-ish under media)
        self.stdout.write('')
        if dry:
            self.stdout.write(self.style.WARNING(f'Dry run — missing references: {missing}'))
        elif clear:
            self.stdout.write(self.style.SUCCESS(f'Cleared {cleared} missing media fields ({missing} found)'))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'Restored {restored} missing media files from demo frame ({missing} were missing).'
            ))
            self.stdout.write('Refresh the Admin portal — /media/... 404s should be gone.')

    def _pick_source(self, media_root: Path) -> Path | None:
        candidates = [
            media_root / 'demo-cameras' / 'monivong-intersection.jpg',
            media_root / 'demo-cameras' / 'monivong-ptz.jpg',
            media_root / 'demo-cameras' / 'nr6-highway.jpg',
            Path(settings.BASE_DIR).resolve().parents[1]
            / 'src' / 'web' / 'admin' / 'public' / 'demo-cameras' / 'monivong-intersection.jpg',
            Path(settings.BASE_DIR).resolve().parents[1]
            / 'ai' / 'datasets' / 'samples' / 'live_camera_frames' / 'monivong-intersection.jpg',
        ]
        for path in candidates:
            if path.is_file() and path.stat().st_size > 0:
                return path
        # Any jpeg under uploads as last resort
        uploads = media_root / 'ai' / 'uploads'
        if uploads.is_dir():
            for jpg in uploads.glob('*.jpg'):
                if jpg.stat().st_size > 1000:
                    return jpg
        return None
