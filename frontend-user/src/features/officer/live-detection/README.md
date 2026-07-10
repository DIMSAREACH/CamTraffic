# Live Detection

> **Phase 4** · Tasks **064**

## Overview

Real-time AI detection monitoring scoped to the officer's assigned police station.

## Folder

`frontend-user/src/features/officer/live-detection/`

## Structure

```text
frontend-user/src/features/officer/live-detection/
├── OfficerLiveDetectionPage.tsx
├── index.ts
└── README.md
```

## API

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/detections/officer/monitoring/summary/` | Station detection metrics |
| `GET /api/v1/detections/officer/monitoring/` | Filtered detection feed |
| `GET /api/v1/detections/officer/cameras/` | Station camera filter options |

## Related Tasks

| Task | Status |
|------|--------|
| Task 064 | ✅ Completed |

## Status

- [x] Backend officer live detection endpoints (station-scoped)
- [x] Shared types and API client
- [x] `OfficerLiveDetectionPage` wired at `/officer/live-detection`
- [x] Auto-refresh every 20 seconds

## Notes

Reuses `DetectionMonitorRecord` / `DetectionMonitorSummary` types from admin detection monitoring (Task 046).
