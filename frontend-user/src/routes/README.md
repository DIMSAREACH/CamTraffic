# User Routing

> **Phase 4** · Tasks **060**

## Overview

Officer and driver route definitions with token-protected portal paths.

## Folder

`frontend-user/src/routes/`

## Structure

```text
frontend-user/src/routes/
├── UserRoutes.tsx
├── RouteGuard.tsx
├── index.ts
└── README.md
```

## Routes

| Path | Access |
|------|--------|
| `/` | Public — login |
| `/forgot-password` | Public |
| `/reset-password` | Public (with uid/token query) |
| `/verify-email` | Public (with uid/token query) |
| `/officer/*` | Protected — officer portal |
| `/driver/*` | Protected — driver portal |

## Related Tasks

| Task | Status |
|------|--------|
| Task 060 | ✅ Completed |

## Status

- [x] Route definitions for auth/public/officer/driver paths
- [x] Protected route guard component
- [x] BrowserRouter wired via app bootstrap
- [x] Role-based portal redirect in App

## Notes

Officer users land on `/officer/dashboard`; driver users on `/driver/dashboard`. Cross-portal access redirects to the user's home route.
