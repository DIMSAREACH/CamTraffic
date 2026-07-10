# Appeals App

> **Phase 4/6** · Tasks **080, 102**

## Overview

Violation appeal submission and officer review APIs.

## Driver Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/appeals/driver/appealable/` | List appealable approved violations |
| `GET` | `/api/v1/appeals/driver/mine/` | List driver's appeals |
| `POST` | `/api/v1/appeals/driver/mine/` | Submit appeal (multipart) |
| `GET` | `/api/v1/appeals/driver/mine/<id>/` | Appeal detail |

## Officer Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/appeals/officer/review/` | Station appeal queue |
| `GET` | `/api/v1/appeals/officer/review/<id>/` | Appeal review detail |
| `POST` | `/api/v1/appeals/officer/review/<id>/decision/` | Approve/reject appeal |

## Related Tasks

| Task | Status |
|------|--------|
| Task 080 | ✅ Driver appeal submission |
| Task 102 | ✅ Appeal API |

## Status

- [x] Driver appeal submission and history
- [x] Officer station-scoped appeal review and decisions

## Notes

- Approved appeals overturn the violation (`rejected`) and waive unpaid fines.
- Rejected appeals restore the violation to `approved`.
