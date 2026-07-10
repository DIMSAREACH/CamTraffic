# User Authentication

> **Phase 2** · Tasks **016–019**

## Overview

Login, password flows for officers and drivers.

## Folder

`frontend-user/src/features/auth/`

## Structure

```text
frontend-user/src/features/auth/
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
| Task 016 | ✅ Completed |
| Task 017 | ✅ Completed |
| Task 018 | ✅ Completed |
| Task 019 | ✅ Completed |
| Task 020 | ✅ Completed |

## Status

- [x] Login UI with email/password form
- [x] Backend JWT integration (`/api/v1/auth/login/`)
- [x] Officer/driver role guard (`officer` / `driver`)
- [x] Session bootstrap via `/api/v1/auth/me/`
- [x] Portal-specific token storage (`camtraffic-user-*` keys)
- [x] Forgot password form (`/api/v1/auth/forgot-password/`)
- [x] Reset password form (`/reset-password?uid=...&token=...`)
- [x] Change password form (`/api/v1/auth/change-password/`)
- [x] Email verification panel + `/verify-email` link handler

## Notes

User portal tokens are stored separately from the admin portal so both apps can run on the same machine without session conflicts.

Reset links are emailed via the Django console backend in development. Check the backend terminal for the `/reset-password?uid=...&token=...` URL.

Change password is available in the authenticated officer/driver session shell.
