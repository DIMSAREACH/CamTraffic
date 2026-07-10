# Notification Templates

> **Phase 3** · Tasks **056**

## Overview

Notification template management for email, SMS, and in-app channels.

## Folder

`frontend-admin/src/features/notifications/`

## Structure

```text
frontend-admin/src/features/notifications/
├── NotificationTemplatesManagementPage.tsx
└── README.md
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 056 | ✅ Completed |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed

## Notes

Task 056 — templates from `/api/v1/notifications/templates/manage/`:
- CRUD for bilingual notification templates (English/Khmer)
- Channel support: in-app, email, SMS
- Search and channel filters
- Delete blocked when notifications have been sent from a template
