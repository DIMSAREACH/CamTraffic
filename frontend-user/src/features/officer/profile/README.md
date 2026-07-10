# Officer Profile

> **Phase 4** · Tasks **073**

## Overview

Officer personal profile, assignment details, avatar upload, and account security settings.

## Folder

`frontend-user/src/features/officer/profile/`

## Structure

```text
frontend-user/src/features/officer/profile/
├── README.md
├── index.ts
├── AvatarUpload.tsx
└── OfficerProfilePage.tsx
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/users/profile/me/` | User profile details |
| `PATCH` | `/api/v1/users/profile/me/` | Update user profile |
| `POST/DELETE` | `/api/v1/users/profile/me/avatar/` | Avatar upload/remove |
| `GET` | `/api/v1/officers/officer/profile/` | Officer assignment profile |
| `PATCH` | `/api/v1/officers/officer/profile/` | Update officer rank |

## Related Tasks

| Task | Status |
|------|--------|
| Task 021–022 | ✅ Shared user profile API |
| Task 073 | ✅ Completed |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed

## Notes

- Badge number, station, and hire date are read-only for officers.
- Officers can update personal profile fields and rank.
- Password change and email verification panels are included on the profile page.
- `OfficerProfilePage` wired at `/officer/profile`.
