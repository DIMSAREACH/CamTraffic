# Mobile API for CamTraffic

Thin, bandwidth-friendly REST surface for Flutter / React Native clients.

Mounted at: **`/api/mobile/`** (and `/api/v1/mobile/`)

## Endpoints

| Method | Path | Role |
|--------|------|------|
| GET | `/api/mobile/home/` | any authenticated |
| GET | `/api/mobile/vehicles/` | driver |
| GET | `/api/mobile/violations/` | driver |
| GET | `/api/mobile/fines/?status=pending` | driver |
| GET/POST | `/api/mobile/appeals/` | driver (one appeal per violation) |
| GET/POST | `/api/mobile/notifications/` | any (POST marks all read) |
| POST | `/api/mobile/device-token/` | any |
| GET | `/api/mobile/cases/pending/` | officer/admin |
| POST | `/api/mobile/cases/{id}/approve/` | officer/admin → issues fine |
| POST | `/api/mobile/cases/{id}/reject/` | officer/admin |
| GET | `/api/mobile/evidence/{id}/` | owner / officer / admin |

## Auth

Reuse JWT from `/api/auth/login/`:

```http
Authorization: Bearer <access_token>
```

## Business rules enforced

1. Officer must approve AI detection before a fine is issued (`approve` creates Fine).
2. One appeal per violation (mobile create rejects duplicates).
3. All approve/reject/appeal actions write `audit_logs`.

## Example

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"driver@demo.local\",\"password\":\"Demo1234!\"}"

curl http://127.0.0.1:8000/api/mobile/home/ \
  -H "Authorization: Bearer <token>"
```

This package is a Django app living at repo root `mobile_api/` and registered in `INSTALLED_APPS`.
