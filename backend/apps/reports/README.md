# Reports App

> **Phase 3/6** · Tasks **052–054, 103**

## Overview

Report generation and export APIs with CSV, PDF, and Excel output.

## Folder

`backend/apps/reports/`

## Structure

```text
backend/apps/reports/
├── README.md          # This file
├── models.py          # ReportExport model
├── services.py        # Report catalog and data collection
├── export_formats.py  # PDF/Excel/CSV file builders
├── serializers.py     # Report serializers
├── views.py           # Catalog and export views
└── urls.py            # Report API routes
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 052 | ✅ Completed |
| Task 054 | ✅ Completed |
| Task 071 | ✅ Officer station-scoped reports |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed (Tasks 052 & 054)

## Notes

Task 052 endpoints (admin/super_admin):
- `GET /api/v1/reports/catalog/`
- `GET/POST /api/v1/reports/exports/`
- `GET /api/v1/reports/exports/<id>/`

Task 054 — export formats:
- CSV via built-in `csv` module
- PDF via `reportlab` (summary + detail tables)
- Excel via `openpyxl` (`.xlsx` workbooks)

Task 071 endpoints (officer):
- `GET /api/v1/reports/officer/catalog/`
- `GET/POST /api/v1/reports/officer/exports/`
- `GET /api/v1/reports/officer/exports/<id>/`

Officer exports inject `station_id` into report parameters and only return exports requested by the current officer.
