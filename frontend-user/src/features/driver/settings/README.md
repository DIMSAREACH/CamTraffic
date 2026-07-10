# Driver Settings

> **Phase 4** · Tasks **082**

## Overview

Driver account preferences: notification toggles and appearance settings (theme + locale).

## Folder

`frontend-user/src/features/driver/settings/`

## Structure

```text
frontend-user/src/features/driver/settings/
├── README.md
├── index.ts
└── DriverSettingsPage.tsx
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/drivers/driver/settings/` | Load notification preferences |
| `PATCH` | `/api/v1/drivers/driver/settings/` | Update notification preferences |
| `GET` | `/api/v1/profile/me/` | Load account profile (locale) |
| `PATCH` | `/api/v1/profile/me/` | Update preferred locale |

## Related Tasks

| Task | Status |
|------|--------|
| Task 075 | ✅ Driver profile |
| Task 082 | ✅ Completed |

## Status

- [x] Backend driver settings model fields and endpoints
- [x] Shared types and API client
- [x] `DriverSettingsPage` wired at `/driver/settings`

## Notes

- Notification toggles: email, violations, fines, appeals (stored on `Driver` model).
- Theme toggle applies immediately via UI provider; locale is saved with the form submit.
- Run `python manage.py migrate` after pulling to apply `0002_driver_notification_preferences`.
