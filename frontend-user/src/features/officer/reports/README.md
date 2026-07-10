# Officer Reports

> **Phase 4** · Tasks **071**

## Overview

Station-scoped report generation and export history for officers.

## Folder

`frontend-user/src/features/officer/reports/`

## Structure

```text
frontend-user/src/features/officer/reports/
├── README.md
├── index.ts
└── OfficerReportsPage.tsx
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/reports/officer/catalog/` | Station report catalog |
| `GET` | `/api/v1/reports/officer/exports/` | Officer export history |
| `POST` | `/api/v1/reports/officer/exports/` | Generate a station-scoped export |
| `GET` | `/api/v1/reports/officer/exports/<id>/` | Export detail |

## Related Tasks

| Task | Status |
|------|--------|
| Task 052 / 054 | ✅ Admin reports foundation |
| Task 071 | ✅ Completed |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed

## Notes

- Exports are automatically scoped to the officer's assigned station.
- Supports CSV, PDF, and Excel formats for violations, detections, fines, and cameras.
- Officers only see exports they requested.
- `OfficerReportsPage` wired at `/officer/reports`.
