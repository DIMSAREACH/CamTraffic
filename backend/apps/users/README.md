# Users App

> **Phase 2/6** · Tasks **021–022, 038, 092**

## Overview

User profiles, avatars, and admin user management.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/users/profile/me/` | Bearer JWT | Current user profile |
| `PATCH` | `/api/v1/users/profile/me/` | Bearer JWT | Update current user profile |
| `POST` | `/api/v1/users/profile/me/avatar/` | Bearer JWT | Upload profile avatar (multipart) |
| `DELETE` | `/api/v1/users/profile/me/avatar/` | Bearer JWT | Remove profile avatar |
| `GET` | `/api/v1/users/management/` | admin | List users (`search`, `role`) |
| `POST` | `/api/v1/users/management/` | admin | Create user |
| `GET` | `/api/v1/users/management/<id>/` | admin | User detail |
| `PATCH` | `/api/v1/users/management/<id>/` | admin | Update user |
| `DELETE` | `/api/v1/users/management/<id>/` | admin | Delete user |

## Related Tasks

| Task | Status |
|------|--------|
| Task 021 | ✅ Profile |
| Task 022 | ✅ Avatar upload |
| Task 038 | ✅ Admin user CRUD |
| Task 092 | ✅ User API |
| Task 023 | ✅ Login history (`audit` app) |

## Status

- [x] Profile GET/PATCH for authenticated user
- [x] Avatar upload/remove (JPEG, PNG, WebP; max 2MB)
- [x] Admin user list/create/detail/update/delete

## Notes

Login history is served from `/api/v1/audit/login-history/` (audit app).
