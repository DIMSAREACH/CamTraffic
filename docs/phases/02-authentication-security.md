# Phase 2 — Authentication & Security

Tasks **011–024**

| Task | Name | Folder |
|------|------|--------|
| 011 | JWT Authentication | `backend/apps/accounts/` |
| 012 | Refresh Token & Session Management | `backend/apps/accounts/` |
| 013 | RBAC | `backend/apps/rbac/` |
| 014 | Permission Management | `backend/apps/rbac/`, `frontend-admin/src/features/permissions/` |
| 015 | Admin Login UI | `frontend-admin/src/features/auth/` |
| 016 | User Login UI | `frontend-user/src/features/auth/` |
| 017 | Forgot Password | `*/src/features/auth/` |
| 018 | Reset Password | `*/src/features/auth/` |
| 019 | Change Password | `*/src/features/auth/` |
| 020 | Email Verification | `backend/apps/accounts/` |
| 021 | User Profile | `frontend-admin/src/features/profile/` |
| 022 | Avatar Upload | `backend/apps/users/` |
| 023 | Audit Login History | `backend/apps/audit/`, `frontend-admin/src/features/audit-logs/` |
| 024 | Security Middleware | `backend/config/` |

## Status

- [x] Task 011 — JWT login, refresh, `/me`
- [x] Task 012 — logout + refresh token blacklisting
- [x] Task 013 — RBAC access matrix + role/permission endpoints
- [x] Task 014 — permission CRUD + role-permission assignment
- [x] Task 015 — admin login form + JWT session bootstrap
- [x] Task 016 — user login form + officer/driver session bootstrap
- [x] Task 017 — forgot password request flow (admin + user portals)
- [x] Task 018 — reset password flow via uid/token link (admin + user portals)
- [x] Task 019 — authenticated change password flow (admin + user portals)
- [x] Task 020 — email verification send + confirm flow
- [x] Task 021 — admin user profile view/edit
- [x] Task 022 — avatar upload/remove for authenticated user
- [x] Task 023 — login attempt history tracking + admin login history panel
- [x] Task 024 — security middleware hardening (rate-limit + hardened headers)
