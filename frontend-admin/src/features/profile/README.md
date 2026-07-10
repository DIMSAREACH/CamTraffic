# Admin Profile

> **Phase 2** · Tasks **021–022**

## Overview

User profile management for the admin portal.

## Folder

`frontend-admin/src/features/profile/`

## Structure

```text
frontend-admin/src/features/profile/
├── ProfileForm.tsx
├── AvatarUpload.tsx
└── README.md
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 021 | ✅ Completed |
| Task 022 | ✅ Completed |

## Status

- [x] Profile form UI (name, phone, locale, bio, address)
- [x] Backend integration (`GET/PATCH /api/v1/users/profile/me/`)
- [x] Avatar upload/remove (`POST/DELETE /api/v1/users/profile/me/avatar/`)

## Notes

Profile data combines `accounts_user` fields with `users_profile` extended fields.
