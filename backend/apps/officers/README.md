# Officers App

> **Phase 3/6** · Tasks **041–042, 073, 093**

## Overview

Officer and police station management APIs.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/officers/stations/` | admin | Active station catalog |
| `GET` | `/api/v1/officers/stations/manage/` | admin | List police stations |
| `POST` | `/api/v1/officers/stations/manage/` | admin | Create police station |
| `GET` | `/api/v1/officers/stations/manage/<id>/` | admin | Station detail |
| `PATCH` | `/api/v1/officers/stations/manage/<id>/` | admin | Update station |
| `DELETE` | `/api/v1/officers/stations/manage/<id>/` | admin | Delete station |
| `GET` | `/api/v1/officers/management/` | admin | List officers |
| `POST` | `/api/v1/officers/management/` | admin | Create officer |
| `GET` | `/api/v1/officers/management/<id>/` | admin | Officer detail |
| `PATCH` | `/api/v1/officers/management/<id>/` | admin | Update officer |
| `DELETE` | `/api/v1/officers/management/<id>/` | admin | Delete officer |
| `GET` | `/api/v1/officers/officer/profile/` | officer | Officer self profile |
| `PATCH` | `/api/v1/officers/officer/profile/` | officer | Update rank |

## Related Tasks

| Task | Status |
|------|--------|
| Task 041 | ✅ Officer management |
| Task 042 | ✅ Police station management |
| Task 073 | ✅ Officer self profile |
| Task 093 | ✅ Officer API |

## Status

- [x] Officer and police station models
- [x] Admin station catalog and CRUD
- [x] Admin officer list/create/detail/update/delete
- [x] Officer self-service profile

## Notes

Officer creation provisions a linked `accounts.User` with `role=officer` and an `Officer` profile tied to a `PoliceStation`.

Officer self-profile allows rank updates; badge number and station assignment remain read-only.
