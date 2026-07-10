# AI Model Management

> **Phase 3** · Tasks **043–046**

## Overview

Model management, versioning, training history, detection monitoring.

## Folder

`frontend-admin/src/features/ai-models/`

## Structure

```text
frontend-admin/src/features/ai-models/
├── README.md                      # This file
├── AiModelsManagementPage.tsx     # AI model catalog CRUD page
├── AiModelVersionsPanel.tsx       # Model version lifecycle panel
├── AiTrainingHistoryPanel.tsx     # Training run history panel
└── DetectionMonitoringPanel.tsx   # Detection feed and confidence metrics
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 043 | ✅ Completed |
| Task 044 | ✅ Completed |
| Task 045 | ✅ Completed |
| Task 046 | ✅ Completed |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed (Tasks 043–046)

## Notes

Task 046 — detection monitoring from `/api/v1/detections/monitoring/`:
- Summary metrics: total, today, average confidence, low-confidence count, latest detection
- Filter by camera ID, model version, minimum confidence, and search (plate/camera/sign)
- Read-only feed of recent detections with capture thumbnails
