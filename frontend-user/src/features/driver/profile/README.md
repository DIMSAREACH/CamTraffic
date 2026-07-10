# Driver Profile

> **Phase 4** · Tasks **075**

## Overview

Driver personal profile, license details, avatar upload, and account security settings.

## Folder

`frontend-user/src/features/driver/profile/`

## Structure

```text
frontend-user/src/features/driver/profile/
├── README.md
├── index.ts
└── DriverProfilePage.tsx
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/users/profile/me/` | User profile details |
| `PATCH` | `/api/v1/users/profile/me/` | Update user profile |
| `POST/DELETE` | `/api/v1/users/profile/me/avatar/` | Avatar upload/remove |
| `GET` | `/api/v1/drivers/driver/profile/` | Driver license profile |
| `PATCH` | `/api/v1/drivers/driver/profile/` | Update national ID |

## Related Tasks

| Task | Status |
|------|--------|
| Task 021–022 | ✅ Shared user profile API |
| Task 075 | ✅ Completed |

## Status

- [x] Backend driver self-profile endpoints
- [x] Shared types and API client
- [x] `DriverProfilePage` wired at `/driver/profile`

## Notes

- License number, class, and expiry are read-only for drivers.
- Drivers can update personal profile fields and national ID.
- Password change and email verification panels are included on the profile page.
- Avatar upload reuses the officer profile `AvatarUpload` component.
