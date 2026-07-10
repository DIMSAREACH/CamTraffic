# Driver Management

> **Phase 4** · Tasks **068**

## Overview

Officer-side driver registration, search, and profile review.

## Folder

`frontend-user/src/features/officer/drivers/`

## Structure

```text
frontend-user/src/features/officer/drivers/
├── README.md
├── index.ts
└── OfficerDriversManagementPage.tsx
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/drivers/officer/management/` | List drivers with search and active filters |
| `GET` | `/api/v1/drivers/officer/management/<id>/` | Driver detail with registered vehicles |
| `POST` | `/api/v1/drivers/officer/management/` | Register a new driver |
| `PATCH` | `/api/v1/drivers/officer/management/<id>/` | Update driver profile or active status |
| `DELETE` | `/api/v1/drivers/officer/management/<id>/` | Delete driver account |

## Related Tasks

| Task | Status |
|------|--------|
| Task 068 | ✅ Completed |
| Task 094 | ⬜ Full Driver API |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed

## Notes

- Officers can register drivers with license and national ID metadata.
- List items show vehicle count and station-scoped violation count.
- Detail panel lists registered vehicles for the selected driver.
- `OfficerDriversManagementPage` wired at `/officer/drivers`.
