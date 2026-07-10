# Appeal Submission

> **Phase 4** · Tasks **080**

## Overview

Driver violation appeal submission and appeal history.

## Folder

`frontend-user/src/features/driver/appeals/`

## Structure

```text
frontend-user/src/features/driver/appeals/
├── README.md
├── index.ts
└── DriverAppealsPage.tsx
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/appeals/driver/appealable/` | Approved violations eligible for appeal |
| `GET` | `/api/v1/appeals/driver/mine/` | List driver's appeals |
| `POST` | `/api/v1/appeals/driver/mine/` | Submit appeal (multipart) |
| `GET` | `/api/v1/appeals/driver/mine/<id>/` | Appeal detail |

## Related Tasks

| Task | Status |
|------|--------|
| Task 080 | ✅ Completed |
| Task 102 | ⬜ Full appeal review API |

## Status

- [x] Backend driver appeal submission endpoints
- [x] Shared types and API client
- [x] `DriverAppealsPage` wired at `/driver/appeals`

## Notes

- Only approved violations without an active appeal can be submitted.
- Submitting an appeal marks the violation status as `appealed`.
- Optional evidence file can be attached on submission.
