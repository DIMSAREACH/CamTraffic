from __future__ import annotations

import json
from pathlib import Path

from django.conf import settings
from django.utils import timezone

from apps.notifications.models import NotificationTemplate
from apps.traffic_signs.models import SignCategory, TrafficSign

from .models import BackupRecord, SystemSetting

BACKUP_VERSION = '1.0'


def collect_backup_payload() -> dict:
    return {
        'version': BACKUP_VERSION,
        'generated_at': timezone.now().isoformat(),
        'system_settings': list(
            SystemSetting.objects.order_by('key').values(
                'key',
                'value',
                'value_type',
                'description',
                'is_public',
            ),
        ),
        'notification_templates': list(
            NotificationTemplate.objects.order_by('code').values(
                'code',
                'name',
                'channel',
                'subject_en',
                'subject_km',
                'body_en',
                'body_km',
                'is_active',
            ),
        ),
        'sign_categories': list(
            SignCategory.objects.order_by('code').values(
                'code',
                'name_en',
                'name_km',
                'description',
                'is_active',
            ),
        ),
        'traffic_signs': [
            {
                'code': sign.code,
                'name_en': sign.name_en,
                'name_km': sign.name_km,
                'category_code': sign.category.code,
                'description': sign.description,
                'fine_amount': str(sign.fine_amount),
                'is_active': sign.is_active,
            }
            for sign in TrafficSign.objects.select_related('category').order_by('code')
        ],
    }


def _backup_directory() -> Path:
    directory = Path(settings.MEDIA_ROOT) / 'backups'
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def create_backup_record(notes: str = '') -> BackupRecord:
    record = BackupRecord.objects.create(
        filename='',
        file_path='',
        status=BackupRecord.Status.PENDING,
        notes=notes,
    )

    try:
        payload = collect_backup_payload()
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        filename = f'camtraffic_backup_{record.id}_{timestamp}.json'
        relative_path = f'backups/{filename}'
        full_path = _backup_directory() / filename
        content = json.dumps(payload, indent=2)
        full_path.write_text(content, encoding='utf-8')

        record.filename = filename
        record.file_path = relative_path
        record.file_size = full_path.stat().st_size
        record.status = BackupRecord.Status.COMPLETED
    except Exception as exc:  # noqa: BLE001 - persist backup failures on record
        record.status = BackupRecord.Status.FAILED
        record.notes = f'{notes}\n{exc}'.strip() if notes else str(exc)

    record.save()
    return record


def restore_backup_record(record: BackupRecord) -> dict[str, int]:
    if record.status != BackupRecord.Status.COMPLETED:
        raise ValueError('Only completed backups can be restored.')

    full_path = Path(settings.MEDIA_ROOT) / record.file_path
    if not full_path.exists():
        raise FileNotFoundError('Backup file is missing from storage.')

    payload = json.loads(full_path.read_text(encoding='utf-8'))
    counts = {
        'system_settings': 0,
        'notification_templates': 0,
        'sign_categories': 0,
        'traffic_signs': 0,
    }

    for item in payload.get('system_settings', []):
        SystemSetting.objects.update_or_create(
            key=item['key'],
            defaults={
                'value': item['value'],
                'value_type': item['value_type'],
                'description': item.get('description', ''),
                'is_public': item.get('is_public', False),
            },
        )
        counts['system_settings'] += 1

    for item in payload.get('notification_templates', []):
        NotificationTemplate.objects.update_or_create(
            code=item['code'],
            defaults={
                'name': item['name'],
                'channel': item['channel'],
                'subject_en': item['subject_en'],
                'subject_km': item.get('subject_km', ''),
                'body_en': item['body_en'],
                'body_km': item.get('body_km', ''),
                'is_active': item.get('is_active', True),
            },
        )
        counts['notification_templates'] += 1

    for item in payload.get('sign_categories', []):
        SignCategory.objects.update_or_create(
            code=item['code'],
            defaults={
                'name_en': item['name_en'],
                'name_km': item['name_km'],
                'description': item.get('description', ''),
                'is_active': item.get('is_active', True),
            },
        )
        counts['sign_categories'] += 1

    for item in payload.get('traffic_signs', []):
        category = SignCategory.objects.get(code=item['category_code'])
        TrafficSign.objects.update_or_create(
            code=item['code'],
            defaults={
                'name_en': item['name_en'],
                'name_km': item['name_km'],
                'category': category,
                'description': item.get('description', ''),
                'fine_amount': item.get('fine_amount', 0),
                'is_active': item.get('is_active', True),
            },
        )
        counts['traffic_signs'] += 1

    return counts


def delete_backup_file(record: BackupRecord) -> None:
    if record.file_path:
        full_path = Path(settings.MEDIA_ROOT) / record.file_path
        if full_path.exists():
            full_path.unlink()
