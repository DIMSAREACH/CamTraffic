# Officer Management

> **Phase 3** · Tasks **041**

## Overview

Traffic officer profiles and station assignments.

## Folder

`frontend-admin/src/features/officers/`

## Structure

```text
frontend-admin/src/features/officers/
├── README.md                    # This file
└── OfficersManagementPage.tsx   # Officer CRUD page
```

## Related Tasks

| Task | Status |
|------|--------|
| Task 041 | ✅ Completed |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed

## Notes

Implements officer management for admins:
- List officers from `/api/v1/officers/management/`
- Load police station options from `/api/v1/officers/stations/`
- Create officers with linked user accounts (`role=officer`)
- Search by badge, email, or name
- Filter by police station
- Toggle active state and delete officers
