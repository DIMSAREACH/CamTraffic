# Live Camera View

> **Phase 4** · Tasks **065**

## Overview

Live camera stream viewer scoped to the officer's assigned police station.

## Folder

`frontend-user/src/features/officer/live-camera/`

## Structure

```text
frontend-user/src/features/officer/live-camera/
├── OfficerLiveCameraPage.tsx
├── index.ts
└── README.md
```

## API

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/cameras/officer/live/` | Station live camera dashboard with stream metadata |

## Related Tasks

| Task | Status |
|------|--------|
| Task 065 | ✅ Completed |

## Status

- [x] Backend officer live camera endpoint (station-scoped)
- [x] API client method `api.cameras.officer.liveDashboard`
- [x] `OfficerLiveCameraPage` wired at `/officer/live-camera`
- [x] Auto-refresh every 30 seconds

## Notes

Reuses `CameraLiveDashboard` / `CameraLiveFeedItem` types from admin live camera dashboard (Task 048).
