# Reports

> **Phase 3** · Tasks **052, 054**

## Overview

Report generation and PDF/Excel/CSV export.

## Folder

`frontend-admin/src/features/reports/`

## Structure

```text
frontend-admin/src/features/reports/
├── README.md                  # This file
└── ReportsManagementPage.tsx  # Report catalog and export history
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 052 | ✅ Completed |
| Task 054 | ✅ Completed |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed (Tasks 052 & 054)

## Notes

Task 052 — reports from `/api/v1/reports/`:
- Report catalog for violations, detections, fines, and cameras
- Generate exports with optional date range filters
- Export history with status and download links

Task 054 — export formats:
- CSV, PDF, and Excel exports generated on the backend
- Format picker respects each report type's `supported_formats`
- Download links show the selected format label
