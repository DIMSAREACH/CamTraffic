# Driver Dashboard

> **Phase 4** · Tasks **074**

## Overview

Driver home dashboard with personal stats, violation/fine charts, activity feed, and notifications.

## Folder

`frontend-user/src/features/driver/dashboard/`

## Structure

```text
frontend-user/src/features/driver/dashboard/
├── DriverDashboardHome.tsx
├── index.ts
└── README.md
```

## API

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/dashboard/driver/stats/` | License, vehicles, violations, fines, appeals |
| `GET /api/v1/dashboard/driver/charts/` | Violation and fine charts (7d) |
| `GET /api/v1/dashboard/driver/activities/` | Recent violations and fines |
| `GET /api/v1/dashboard/driver/notifications/` | Driver notification center |

## Related Tasks

| Task | Status |
|------|--------|
| Task 074 | ✅ Completed |

## Status

- [x] Backend driver dashboard endpoints (user-scoped)
- [x] Shared types and API client
- [x] `DriverDashboardHome` wired at `/driver/dashboard`

## Notes

All metrics are scoped to the authenticated driver's account (violations, vehicles, fines, appeals).
