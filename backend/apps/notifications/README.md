# Notifications App

> **Phase 3/6** · Tasks **056–057, 104**

## Overview

Notification and template APIs.

## Folder

`backend/apps/notifications/`

## Structure

```text
backend/apps/notifications/
├── README.md          # This file
├── models.py          # NotificationTemplate, Notification
├── serializers.py     # Template management serializers
├── views.py           # Template CRUD views
└── urls.py            # Notification API routes
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 056 | ✅ Completed |
| Task 057 | ⬜ Not started |
| Task 072 | ✅ Officer notification center |
| Task 081 | ✅ Driver notification center |
| Task 104 | ✅ Notification API |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed (Task 056)

## Notes

Task 056 endpoints (admin/super_admin):
- `GET/POST /api/v1/notifications/templates/manage/`
- `PATCH/DELETE /api/v1/notifications/templates/manage/<id>/`

Task 072 endpoints (officer):
- `GET /api/v1/notifications/officer/summary/`
- `GET /api/v1/notifications/officer/`
- `GET/PATCH /api/v1/notifications/officer/<id>/`
- `POST /api/v1/notifications/officer/read-all/`

Task 081 endpoints (driver):
- `GET /api/v1/notifications/driver/summary/`
- `GET /api/v1/notifications/driver/`
- `GET/PATCH /api/v1/notifications/driver/<id>/`
- `POST /api/v1/notifications/driver/read-all/`

Seed data: `python manage.py seed_database` creates default email, SMS, and in-app templates.
