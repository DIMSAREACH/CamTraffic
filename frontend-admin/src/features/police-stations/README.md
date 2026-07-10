# Police Station Management

> **Phase 3** · Tasks **042**

## Overview

Police station CRUD and location management.

## Folder

`frontend-admin/src/features/police-stations/`

## Structure

```text
frontend-admin/src/features/police-stations/
├── README.md                          # This file
└── PoliceStationsManagementPage.tsx   # Station CRUD page
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 042 | ✅ Completed |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed

## Notes

Implements police station management for admins:
- List stations from `/api/v1/officers/stations/manage/`
- Create stations with code, bilingual name, address, province, district, phone, and coordinates
- Search by code, name, province, or district
- Toggle active state and delete stations without assigned officers
