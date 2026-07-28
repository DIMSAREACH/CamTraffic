"""
Repair missing AI detection upload files by copying matched Cambodia traffic-sign images.
Also ensures serializer fallbacks have real catalog images on disk.
"""
from __future__ import annotations

import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from ai_detection.models import AIDetectionLog
from traffic_signs.models import TrafficSign


def find_sign(label: str) -> TrafficSign | None:
    label = (label or '').strip()
    if not label:
        return None
    # Normalize common seed labels → catalog names
    aliases = {
        'yield sign': 'yield',
        'stop sign': 'stop',
        'one way': 'one-way',
        'school zone': 'school',
        'speed limit 50': 'speed limit 50',
        'speed limit 40': 'speed limit 40',
        'no u-turn': 'no u-turn',
        'no u turn': 'no u-turn',
    }
    query = aliases.get(label.lower(), label)
    return (
        TrafficSign.objects.filter(sign_name_en__iexact=label).exclude(image='').first()
        or TrafficSign.objects.filter(sign_name__iexact=label).exclude(image='').first()
        or TrafficSign.objects.filter(sign_name_km=label).exclude(image='').first()
        or TrafficSign.objects.filter(sign_name_en__icontains=query).exclude(image='').first()
        or TrafficSign.objects.filter(sign_name__icontains=query).exclude(image='').first()
        or TrafficSign.objects.filter(sign_name_en__icontains=label.split()[0]).exclude(image='').first()
    )


class Command(BaseCommand):
    help = 'Copy traffic-sign catalog images onto missing AI detection upload paths'

    def handle(self, *args, **options):
        media = Path(settings.MEDIA_ROOT)
        repaired = 0
        skipped = 0
        unmatched = 0

        for log in AIDetectionLog.objects.iterator():
            name = getattr(log.uploaded_image, 'name', '') or ''
            dest = media / name if name else None
            if dest and dest.is_file():
                skipped += 1
                continue

            sign = find_sign(log.detected_sign)
            if not sign or not sign.image:
                unmatched += 1
                continue

            src = media / sign.image.name
            if not src.is_file():
                unmatched += 1
                continue

            if not name:
                # Assign a stable path under uploads/
                safe = ''.join(c if c.isalnum() or c in '-_' else '_' for c in (log.detected_sign or 'sign'))[:40]
                name = f'ai/uploads/repaired_{log.pk}_{safe}{src.suffix or ".png"}'
                log.uploaded_image.name = name
                dest = media / name

            assert dest is not None
            dest.parent.mkdir(parents=True, exist_ok=True)
            if not dest.is_file():
                shutil.copy2(src, dest)
            if log.uploaded_image.name != name:
                log.uploaded_image.name = name
            log.save(update_fields=['uploaded_image'])
            repaired += 1

        self.stdout.write(self.style.SUCCESS(
            f'Repaired {repaired} detections | already ok {skipped} | unmatched {unmatched}'
        ))
