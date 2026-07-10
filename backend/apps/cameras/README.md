# Cameras App

> **Phase 3/5** · Tasks **047–049, 065, 087**

## Overview

Camera registry and management APIs.

## Folder

`backend/apps/cameras/`

## Structure

```text
backend/apps/cameras/
├── README.md          # This file
├── models.py          # Camera model
├── health.py          # Health state helpers and probe logic
├── serializers.py     # Management + dashboard + health serializers
├── views.py           # CRUD, live dashboard, and health views
└── urls.py            # Camera API routes
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 047 | ✅ Completed |
| Task 048 | ✅ Completed |
| Task 049 | ✅ Completed |
| Task 065 | ✅ Completed |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed (Tasks 047–049)

## Notes

Task 048 endpoints (admin/super_admin):
- `GET /api/v1/cameras/live-dashboard/` — live camera dashboard with stream metadata

Task 065 endpoints (officer, station-scoped):
- `GET /api/v1/cameras/officer/live/` — station live camera dashboard with stream metadata

Task 049 endpoints (admin/super_admin):
- `GET /api/v1/cameras/health/` — health summary and camera health records
- `POST /api/v1/cameras/health/<id>/check/` — run health check on one camera
- `POST /api/v1/cameras/health/check-all/` — run health checks on all active cameras
