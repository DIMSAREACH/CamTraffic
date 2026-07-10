# Drivers App

> **Phase 4/6** · Tasks **068, 075, 082, 094**

## Overview

Driver management APIs for officer registration and driver self-service.

## Officer Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/drivers/officer/management/` | List drivers |
| `GET` | `/api/v1/drivers/officer/management/<id>/` | Driver detail |
| `POST` | `/api/v1/drivers/officer/management/` | Create driver |
| `PATCH` | `/api/v1/drivers/officer/management/<id>/` | Update driver |
| `DELETE` | `/api/v1/drivers/officer/management/<id>/` | Delete driver |

## Driver Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/drivers/driver/profile/` | Driver self profile |
| `PATCH` | `/api/v1/drivers/driver/profile/` | Update national ID |
| `GET` | `/api/v1/drivers/driver/settings/` | Driver notification preferences |
| `PATCH` | `/api/v1/drivers/driver/settings/` | Update notification preferences |

## Related Tasks

| Task | Status |
|------|--------|
| Task 068 | ✅ Officer driver management |
| Task 075 | ✅ Driver self profile |
| Task 082 | ✅ Driver settings preferences |
| Task 094 | ✅ Driver API |

## Status

- [x] Officer driver list/create/detail/update/delete
- [x] Driver self profile and settings endpoints
- [x] Vehicle summaries on driver detail

## Notes

- Driver list annotates `vehicle_count` and `station_violation_count` for the officer's assigned station.
- Creating a driver also creates the linked `accounts.User` with role `driver`.
