# Officer Notifications

> **Phase 4** · Tasks **072**

## Overview

Officer notification center with unread tracking and read-state management.

## Folder

`frontend-user/src/features/officer/notifications/`

## Structure

```text
frontend-user/src/features/officer/notifications/
├── README.md
├── index.ts
└── OfficerNotificationsPage.tsx
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/notifications/officer/summary/` | Total and unread counts |
| `GET` | `/api/v1/notifications/officer/` | List officer notifications |
| `GET` | `/api/v1/notifications/officer/<id>/` | Notification detail |
| `PATCH` | `/api/v1/notifications/officer/<id>/` | Mark read or unread |
| `POST` | `/api/v1/notifications/officer/read-all/` | Mark all notifications read |

## Related Tasks

| Task | Status |
|------|--------|
| Task 063 | ✅ Dashboard notification preview |
| Task 072 | ✅ Completed |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed

## Notes

- Notifications are scoped to the authenticated officer user.
- Supports search and read/unread filters.
- `OfficerNotificationsPage` wired at `/officer/notifications`.
