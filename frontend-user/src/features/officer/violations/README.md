# Violation Review

> **Phase 4** · Tasks **066–067**

## Overview

Review, approve, and reject station violations with evidence review and fine issuance.

## Folder

`frontend-user/src/features/officer/violations/`

## Structure

```text
frontend-user/src/features/officer/violations/
├── OfficerViolationReviewPage.tsx
├── index.ts
└── README.md
```

## API

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/violations/officer/review/` | List station violations with filters |
| `GET /api/v1/violations/officer/review/<id>/` | Violation review detail |
| `POST /api/v1/violations/officer/review/<id>/decision/` | Approve or reject a pending violation |

## Related Tasks

| Task | Status |
|------|--------|
| Task 066 | ✅ Completed |
| Task 067 | ✅ Completed |

## Status

- [x] Backend officer violation review list/detail endpoints
- [x] Approve/reject decision endpoint with fine issuance on approval
- [x] Shared types and API client
- [x] `OfficerViolationReviewPage` wired at `/officer/violations`

## Notes

Approving a pending violation creates an unpaid fine using the traffic sign amount and system `fine_due_days` setting.
