# Traffic Signs App

> **Phase 3** · Tasks **050–051, 088**

## Overview

Traffic sign registry and management APIs.

## Folder

`backend/apps/traffic_signs/`

## Structure

```text
backend/apps/traffic_signs/
├── README.md          # This file
├── models.py          # SignCategory and TrafficSign models
├── serializers.py     # Category and sign management serializers
├── views.py           # Catalog, category CRUD, and sign CRUD views
└── urls.py            # Traffic sign API routes
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 050 | ✅ Completed |
| Task 051 | ✅ Completed |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed (Tasks 050–051)

## Notes

Task 051 endpoints (admin/super_admin):
- `GET/POST /api/v1/traffic-signs/categories/manage/`
- `PATCH/DELETE /api/v1/traffic-signs/categories/manage/<id>/`
- `GET /api/v1/traffic-signs/categories/` — active category catalog (unchanged)
