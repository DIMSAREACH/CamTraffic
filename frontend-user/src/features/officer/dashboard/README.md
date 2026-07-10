# Officer Dashboard

> **Phase 4** · Tasks **063**

## Overview

Officer home dashboard with station-scoped stats, charts, activity feed, camera status, and notifications.

## Folder

`frontend-user/src/features/officer/dashboard/`

## Structure

```text
frontend-user/src/features/officer/dashboard/
├── OfficerDashboardHome.tsx
├── index.ts
└── README.md
```

## API

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/dashboard/officer/stats/` | Station summary metrics |
| `GET /api/v1/dashboard/officer/charts/` | Violation charts (7d) |
| `GET /api/v1/dashboard/officer/activities/` | Recent violations & detections |
| `GET /api/v1/dashboard/officer/camera-status/` | Station camera health |
| `GET /api/v1/dashboard/officer/notifications/` | Officer notification center |

## Related Tasks

| Task | Status |
|------|--------|
| Task 063 | ✅ Completed |

## Status

- [x] Backend officer dashboard endpoints (station-scoped)
- [x] Shared types and API client
- [x] `OfficerDashboardHome` wired at `/officer/dashboard`

## Notes

All metrics are scoped to the authenticated officer's assigned police station.
