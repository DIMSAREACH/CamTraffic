# My Violations

> **Phase 4** · Tasks **077**

## Overview

Driver violation history with evidence and fine status.

## Folder

`frontend-user/src/features/driver/violations/`

## Structure

```text
frontend-user/src/features/driver/violations/
├── README.md
├── index.ts
└── DriverViolationsPage.tsx
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/violations/driver/mine/` | List driver's violations |
| `GET` | `/api/v1/violations/driver/mine/<id>/` | Violation detail with evidence and fine info |

## Related Tasks

| Task | Status |
|------|--------|
| Task 066–067 | ✅ Officer violation review |
| Task 077 | ✅ Completed |

## Status

- [x] Backend driver violation list/detail endpoints
- [x] Shared types and API client
- [x] `DriverViolationsPage` wired at `/driver/violations`

## Notes

- Read-only view scoped to the authenticated driver.
- Detail includes issued fine reference and status when a violation is approved.
