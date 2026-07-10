# Accounts App

> **Phase 2/6** · Tasks **011–012, 017–020, 091**

## Overview

JWT authentication for CamTraffic API using `djangorestframework-simplejwt`.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/login/` | Public | Email + password login |
| `POST` | `/api/v1/auth/refresh/` | Public | Refresh access token |
| `POST` | `/api/v1/auth/logout/` | Bearer JWT | Blacklist refresh token |
| `POST` | `/api/v1/auth/forgot-password/` | Public | Request password reset email |
| `POST` | `/api/v1/auth/reset-password/` | Public | Reset password with `uid` + `token` |
| `POST` | `/api/v1/auth/change-password/` | Bearer JWT | Change password for current user |
| `POST` | `/api/v1/auth/verify-email/send/` | Bearer JWT | Send email verification link |
| `POST` | `/api/v1/auth/verify-email/` | Public | Confirm email with `uid` + `token` |
| `GET` | `/api/v1/auth/me/` | Bearer JWT | Current user profile |

## Related Tasks

| Task | Status |
|------|--------|
| Tasks 011–020 | ✅ Auth foundation |
| Task 091 | ✅ Authentication API |

## Status

- [x] JWT login with email/password
- [x] Access + refresh token issuance
- [x] Refresh token rotation + blacklist strategy
- [x] `/me` authenticated profile endpoint
- [x] Logout + refresh token blacklist
- [x] Forgot/reset/change password flows
- [x] Email verification send + confirm

## Notes

Login writes `LoginHistory` audit records on success and failure.

Seeded superuser (after `python manage.py seed_database`):

- **Email:** `admin@camtraffic.kh`
- **Password:** `admin1234`
