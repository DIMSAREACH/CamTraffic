# Vehicles App

> **Phase 4/6** · Tasks **069, 076, 095**

## Overview

Vehicle registration and management APIs for officer workflows and driver read-only access.

## Officer Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/vehicles/officer/management/` | List vehicles |
| `GET` | `/api/v1/vehicles/officer/management/<id>/` | Vehicle detail |
| `POST` | `/api/v1/vehicles/officer/management/` | Register vehicle |
| `PATCH` | `/api/v1/vehicles/officer/management/<id>/` | Update vehicle |
| `DELETE` | `/api/v1/vehicles/officer/management/<id>/` | Delete vehicle |

## Driver Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/vehicles/driver/mine/` | List driver's vehicles |
| `GET` | `/api/v1/vehicles/driver/mine/<id>/` | Vehicle detail with violations |

## Related Tasks

| Task | Status |
|------|--------|
| Task 069 | ✅ Officer vehicle management |
| Task 076 | ✅ Driver my vehicles |
| Task 095 | ✅ Vehicle API |

## Status

- [x] Officer vehicle list/create/detail/update/delete
- [x] Driver read-only vehicle list and detail
- [x] Violation summaries on vehicle detail

## Notes

- Vehicle list annotates `station_violation_count` for the officer's assigned station.
- Detail includes the 10 most recent violations at the officer's station.
- New vehicles must be assigned to a user with role `driver`.
