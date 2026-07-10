# My Vehicles

> **Phase 4** · Tasks **076**

## Overview

Driver view of registered vehicles with violation history.

## Folder

`frontend-user/src/features/driver/vehicles/`

## Structure

```text
frontend-user/src/features/driver/vehicles/
├── README.md
├── index.ts
└── DriverVehiclesPage.tsx
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/vehicles/driver/mine/` | List driver's vehicles |
| `GET` | `/api/v1/vehicles/driver/mine/<id>/` | Vehicle detail with recent violations |

## Related Tasks

| Task | Status |
|------|--------|
| Task 069 | ✅ Officer vehicle registration |
| Task 076 | ✅ Completed |

## Status

- [x] Backend driver vehicle list/detail endpoints
- [x] Shared types and API client
- [x] `DriverVehiclesPage` wired at `/driver/vehicles`

## Notes

- Drivers have read-only access; vehicle registration is managed by officers.
- Detail includes up to 10 recent violations for the vehicle.
