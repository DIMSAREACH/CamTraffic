# System App

> **Phase 3** · Tasks **057–058**

## Overview

System settings, backup, and restore.

## Folder

`backend/apps/system/`

## Structure

```text
backend/apps/system/
├── README.md           # This file
├── models.py           # SystemSetting, BackupRecord
├── serializers.py      # Settings and backup serializers
├── backup_services.py  # Backup collection, restore, and file storage
├── views.py            # Settings, backup, and locale views
├── locales.py          # Supported API locales
└── urls.py             # System API routes
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 057 | ✅ Completed |
| Task 058 | ✅ Completed |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed (Tasks 057 & 058)

## Notes

Task 057 endpoints (admin/super_admin):
- `GET/POST /api/v1/system/settings/manage/`
- `PATCH/DELETE /api/v1/system/settings/manage/<id>/`

Task 058 endpoints (admin/super_admin):
- `GET/POST /api/v1/system/backups/`
- `GET/DELETE /api/v1/system/backups/<id>/`
- `POST /api/v1/system/backups/<id>/restore/`

Backups export JSON snapshots of system settings, notification templates, sign categories, and traffic signs to `media/backups/`.
