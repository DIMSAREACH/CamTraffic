# Vehicle Management

> **Phase 4** · Tasks **069**

## Overview

Officer-side vehicle registration, search, and violation history review.

## Folder

`frontend-user/src/features/officer/vehicles/`

## Structure

```text
frontend-user/src/features/officer/vehicles/
├── README.md
├── index.ts
└── OfficerVehiclesManagementPage.tsx
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/vehicles/officer/management/` | List vehicles with search and filters |
| `GET` | `/api/v1/vehicles/officer/management/<id>/` | Vehicle detail with station violations |
| `POST` | `/api/v1/vehicles/officer/management/` | Register a vehicle for a driver |
| `PATCH` | `/api/v1/vehicles/officer/management/<id>/` | Update vehicle profile or active status |
| `DELETE` | `/api/v1/vehicles/officer/management/<id>/` | Delete vehicle record |

## Related Tasks

| Task | Status |
|------|--------|
| Task 069 | ✅ Completed |
| Task 095 | ⬜ Full Vehicle API |

## Status

- [x] Scaffolded
- [x] In progress
- [x] Completed

## Notes

- Registration form links vehicles to an existing driver owner.
- List items show owner license and station-scoped violation count.
- Detail panel lists recent violations at the officer's station.
- `OfficerVehiclesManagementPage` wired at `/officer/vehicles`.
