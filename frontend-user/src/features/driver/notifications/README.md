# Driver Notifications

> **Phase 4** · Tasks **081**

## Overview

Driver notification center with summary counts, search/filter, read/unread management, and detail view.

## Folder

`frontend-user/src/features/driver/notifications/`

## Structure

```text
frontend-user/src/features/driver/notifications/
├── README.md
├── index.ts
└── DriverNotificationsPage.tsx
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/notifications/driver/summary/` | Total and unread counts |
| `GET` | `/api/v1/notifications/driver/` | List notifications |
| `GET` | `/api/v1/notifications/driver/<id>/` | Notification detail |
| `PATCH` | `/api/v1/notifications/driver/<id>/` | Mark read/unread |
| `POST` | `/api/v1/notifications/driver/read-all/` | Mark all as read |

## Related Tasks

| Task | Status |
|------|--------|
| Task 072 | ✅ Officer notification center (reference pattern) |
| Task 081 | ✅ Completed |

## Status

- [x] Backend driver notification endpoints
- [x] Shared types and API client
- [x] `DriverNotificationsPage` wired at `/driver/notifications`

## Notes

- Reuses officer notification layout styles (`notifications-*` classes in `index.css`).
- Driver RBAC (`HasRBACRole('driver')`) scopes notifications to the authenticated driver account.
