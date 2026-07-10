# Admin Authentication

> **Phase 2** · Tasks **015, 017–019**

## Overview

Login, forgot password, reset password, change password.

## Folder

`frontend-admin/src/features/auth/`

## Structure

```text
frontend-admin/src/features/auth/
├── LoginForm.tsx
├── ForgotPasswordForm.tsx
├── ResetPasswordForm.tsx
├── ChangePasswordForm.tsx
├── VerifyEmailPage.tsx
├── EmailVerificationPanel.tsx
└── README.md
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 015 | ✅ Completed |
| Task 017 | ✅ Completed |
| Task 018 | ✅ Completed |
| Task 019 | ✅ Completed |
| Task 020 | ✅ Completed |

## Status

- [x] Login UI with email/password form
- [x] Backend JWT integration (`/api/v1/auth/login/`)
- [x] Admin role guard (`admin` / `super_admin`)
- [x] Session bootstrap via `/api/v1/auth/me/`
- [x] Forgot password form (`/api/v1/auth/forgot-password/`)
- [x] Reset password form (`/reset-password?uid=...&token=...`)
- [x] Change password form (`/api/v1/auth/change-password/`)
- [x] Email verification panel + `/verify-email` link handler

## Notes

Reset links are emailed via the Django console backend in development. Check the backend terminal for the `/reset-password?uid=...&token=...` URL.

Change password is available in the authenticated admin session shell.
