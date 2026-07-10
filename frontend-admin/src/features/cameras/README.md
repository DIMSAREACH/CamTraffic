# Camera Management

> **Phase 3** · Tasks **047–049**

## Overview

Camera CRUD, live dashboard, and health monitoring.

## Folder

`frontend-admin/src/features/cameras/`

## Structure

```text
frontend-admin/src/features/cameras/
├── README.md                         # This file
├── CamerasManagementPage.tsx         # Camera CRUD page
├── LiveCameraDashboardPanel.tsx      # Live stream monitoring panel
└── CameraHealthMonitoringPanel.tsx   # Health status and probe actions
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 047 | ✅ Completed |
| Task 048 | ✅ Completed |
| Task 049 | ✅ Completed |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed (Tasks 047–049)

## Notes

Task 049 — camera health monitoring from `/api/v1/cameras/health/`:
- Summary metrics for healthy, warning, critical, unknown, and stale checks
- Filter by search, station, status, and health state
- Run health check on individual cameras or all active cameras
- Auto-refresh every 60 seconds
