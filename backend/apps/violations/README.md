# Violations App

> **Phase 4/6** · Tasks **066–067, 100**

## Overview

Violation review and approval APIs.

## Folder

`backend/apps/violations/`

## Structure

```text
backend/apps/violations/
├── models.py
├── serializers.py
├── services.py
├── views.py
├── urls.py
└── README.md
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 066 | ✅ Completed |
| Task 067 | ✅ Completed |
| Task 070 | ✅ Completed |
| Task 077 | ✅ Completed |
| Task 100 | ✅ Violation API |

## Status

- [x] Officer violation review list/detail endpoints
- [x] Approve/reject decision endpoint with fine issuance

## Notes

Task 066 endpoints (officer, station-scoped):
- `GET /api/v1/violations/officer/review/` — list violations with status/search filters
- `GET /api/v1/violations/officer/review/<id>/` — violation review detail with evidence

Task 067 endpoint (officer):
- `POST /api/v1/violations/officer/review/<id>/decision/` — approve or reject pending violation (`decision`, optional `officer_notes`)

Task 070 endpoints (officer):
- `GET /api/v1/violations/officer/evidence/` — list violations with detection/evidence image metadata
- `GET /api/v1/violations/officer/evidence/<id>/` — evidence detail with bounding box metadata

Task 077 endpoints (driver):
- `GET /api/v1/violations/driver/mine/` — list driver's violations with status/search filters
- `GET /api/v1/violations/driver/mine/<id>/` — violation detail with evidence and issued fine info

Approving creates a `Fine` record when one does not already exist.
