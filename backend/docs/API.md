# CamTraffic REST API Catalog

**Base URL (dev):** `http://127.0.0.1:8000`  
**Prefix:** `/api/` — canonical for frontends (`VITE_API_URL=/api`)  
**Version alias:** `/api/v1/` mirrors all `/api/` routes

**Auth:** `Authorization: Bearer <access_token>` unless noted **Public**.

**Response envelope:**
```json
{ "success": true, "message": "...", "data": { } }
```

**Pagination:** List endpoints accept `?page=` and `?page_size=` where supported.

---

## Health & Monitoring

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health/` | Public | Liveness probe |
| GET | `/health/ready/` | Public | Readiness (DB + cache) |
| GET | `/health/status/` | Public | Extended monitoring status |
| GET | `/api/health/` | Public | API-scoped health alias |

---

## Authentication (`/api/auth/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `login/` | Public | Email + password → JWT pair |
| POST | `register/` | Public | Driver self-registration |
| POST | `logout/` | Auth | Blacklist refresh token |
| POST | `refresh/` | Public | Rotate access token |
| GET | `profile/` | Auth | Current user profile |
| PATCH | `profile/` | Auth | Update profile fields |
| GET | `profile/overview/` | Auth | Profile + sessions + login history |
| GET/PATCH | `profile/preferences/` | Auth | UI preferences |
| POST | `profile/deactivate/` | Auth | Deactivate own account |
| POST | `profile/delete/` | Auth | Request account deletion |
| POST | `profile/logout-others/` | Auth | Invalidate other sessions |
| POST | `change-password/` | Auth | Change password |
| POST | `password-reset/` | Public | Send reset email |
| POST | `password-reset/confirm/` | Public | uid + token + new password |
| POST | `verify-email/send/` | Auth | Resend verification email |
| POST | `verify-email/confirm/` | Public | Confirm email (uid + token) |
| GET | `oauth/status/` | Public | OAuth provider availability |
| GET | `oauth/<provider>/authorize/` | Public | Start OAuth flow |
| GET | `oauth/complete/` | Public | OAuth callback handler |

---

## Users (`/api/users/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/` | Admin | List users (filter by role) |
| POST | `/` | Admin | Create user |
| GET | `<uuid>/` | Admin / self | User detail |
| PATCH | `<uuid>/` | Admin / self | Update user |
| DELETE | `<uuid>/` | Admin | Delete user |
| POST | `<uuid>/toggle-active/` | Admin | Enable/disable account |
| GET | `search/driver/?license=` | Police/Admin | Lookup driver by license |

---

## Officers & Stations (`/api/officers/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/` | Police/Admin | List officers |
| POST | `/` | Admin | Create officer + linked user |
| GET | `<uuid>/` | Police/Admin | Officer detail |
| PATCH | `<uuid>/` | Admin | Update officer |
| DELETE | `<uuid>/` | Admin | Delete officer |
| GET | `stations/` | Police/Admin | List police stations |
| POST | `stations/` | Admin | Create station |
| GET | `stations/<uuid>/` | Police/Admin | Station detail |
| PATCH | `stations/<uuid>/` | Admin | Update station |
| DELETE | `stations/<uuid>/` | Admin | Delete station |

---

## Drivers (`/api/drivers/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/` | Police/Admin | List drivers |
| POST | `/` | Admin | Create driver + linked user |
| GET | `<uuid>/` | Police/Admin | Driver detail |
| PATCH | `<uuid>/` | Admin | Update driver |
| DELETE | `<uuid>/` | Admin | Delete driver |

---

## RBAC (`/api/rbac/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `permissions/` | Admin | List all permissions |
| GET | `roles/` | Admin | List roles |
| POST | `roles/` | Admin | Create role |
| GET | `roles/<uuid>/` | Admin | Role detail |
| PATCH | `roles/<uuid>/` | Admin | Update role |
| DELETE | `roles/<uuid>/` | Admin | Delete role |
| POST | `roles/<uuid>/permissions/` | Admin | Assign permissions to role |

---

## Vehicles (`/api/vehicles/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/` | Auth | List vehicles (scoped by role) |
| POST | `/` | Driver/Admin | Register vehicle |
| GET | `search/?plate=` | Police/Admin | Search by plate |
| GET | `<id>/` | Auth | Vehicle detail |
| PATCH | `<id>/` | Owner/Admin | Update vehicle |
| DELETE | `<id>/` | Owner/Admin | Delete vehicle |

---

## Traffic Signs (`/api/signs/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/` | Auth | List sign catalog |
| POST | `/` | Admin | Create sign entry |
| POST | `chatbot/` | Auth | Sign Q&A chatbot |
| GET | `<id>/` | Auth | Sign detail |
| PATCH | `<id>/` | Admin | Update sign |
| DELETE | `<id>/` | Admin | Delete sign |

---

## Infrastructure

### Roads (`/api/roads/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/` | Auth | List roads |
| POST | `/` | Admin | Create road |
| GET | `<uuid>/` | Auth | Road detail |
| PATCH | `<uuid>/` | Admin | Update road |
| DELETE | `<uuid>/` | Admin | Delete road |

### Cameras (`/api/cameras/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/` | Auth | List cameras |
| POST | `/` | Admin | Register camera |
| GET | `live-status/` | Auth | Live health snapshot for all cameras |
| GET | `<uuid>/` | Auth | Camera detail |
| PATCH | `<uuid>/` | Admin | Update camera |
| DELETE | `<uuid>/` | Admin | Delete camera |

---

## AI Detection (`/api/ai/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `detect/` | Police/Admin | Full pipeline: sign + vehicle + plate |
| POST | `process-frame/` | Police/Admin | Webcam frame processing |
| POST | `tts/` | Auth | Khmer text-to-speech for sign labels |
| GET | `logs/` | Police/Admin | Detection history |
| GET | `logs/export/` | Admin | Export logs (CSV) |
| GET | `stats/` | Police/Admin | Detection page statistics |

---

## OCR (`/api/ocr/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/` | Police/Admin | List OCR results from logs |
| POST | `recognize/` | Police/Admin | Standalone plate OCR upload |

---

## AI Models (`/api/ai-models/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/` | Admin | List registered model versions |
| POST | `/` | Admin | Register new model version |
| POST | `<uuid>/activate/` | Admin | Set active production model |

---

## Violations (`/api/violations/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/` | Auth | List violations (role-scoped) |
| POST | `/` | Police/Admin | Create violation record |
| POST | `evaluate/` | Police/Admin | Evaluate detection → violation |
| GET | `stats/` | Police/Admin | Violation statistics |
| GET | `rules/` | Auth | List violation rules |
| POST | `seed-rules/` | Admin | Seed default rules |
| GET | `<id>/` | Auth | Violation detail |
| PATCH | `<id>/` | Police/Admin | Update violation status |

---

## Fines (`/api/fines/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/` | Auth | List fines (role-scoped) |
| POST | `/` | Police/Admin | Issue fine |
| GET | `lookup/?license=` | Police/Admin | Driver lookup for fine issuance |
| GET | `<uuid>/` | Auth | Fine detail |
| PATCH | `<uuid>/` | Police/Admin | Update fine |
| POST | `<uuid>/pay/` | Driver | Record payment |
| GET | `<uuid>/pdf/` | Auth | Download fine PDF receipt |

---

## Appeals (`/api/appeals/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/` | Auth | List appeals |
| POST | `/` | Driver | Submit appeal |
| GET | `<uuid>/` | Auth | Appeal detail |
| PATCH | `<uuid>/` | Auth | Update pending appeal |
| POST | `<uuid>/review/` | Police/Admin | Approve or reject appeal |

---

## Unknown Vehicles (`/api/unknown-vehicles/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/` | Police/Admin | List unregistered sightings |
| POST | `<uuid>/resolve/` | Police/Admin | Link to driver or dismiss |

---

## Dashboard & Reports (`/api/dashboard/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `admin/` | Admin | Admin KPI dashboard |
| GET | `admin/report/pdf/` | Admin | Admin PDF report |
| GET | `admin/backup/` | Admin | Download system backup ZIP |
| GET | `admin/backups/` | Admin | List stored backups |
| POST | `admin/backups/<filename>/restore/` | Admin | Restore from backup |
| GET | `police/` | Police | Officer dashboard stats |
| GET | `police/reports/` | Police | Officer report data |
| GET | `police/reports/pdf/` | Police | Officer PDF report |
| GET | `enforcement/export.xlsx/` | Police/Admin | Monthly Excel export |
| GET | `evidence/` | Police/Admin | Evidence archive listing |
| GET | `driver/` | Driver | Driver dashboard stats |

---

## Notifications (`/api/notifications/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/` | Auth | List user notifications |
| POST | `read/` | Auth | Mark all as read |
| POST | `clear-read/` | Auth | Delete read notifications |
| POST | `<id>/read/` | Auth | Mark single notification read |

---

## Audit (`/api/audit/`)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/` | Admin | Paginated audit log |

---

## Endpoint count

| Module | Endpoints |
|--------|-----------|
| Health | 4 |
| Auth | 18 |
| Users | 7 |
| Officers | 10 |
| Drivers | 5 |
| RBAC | 7 |
| Vehicles | 6 |
| Signs | 6 |
| Roads | 5 |
| Cameras | 6 |
| AI | 6 |
| OCR | 2 |
| AI Models | 3 |
| Violations | 8 |
| Fines | 7 |
| Appeals | 5 |
| Unknown Vehicles | 2 |
| Dashboard | 11 |
| Notifications | 4 |
| Audit | 1 |
| **Total** | **~120 route handlers** |

---

## Error codes

| HTTP | Meaning |
|------|---------|
| 400 | Validation error |
| 401 | Missing or invalid token |
| 403 | Insufficient role/permission |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Server error |

---

## Frontend integration

Both portals proxy `/api` → backend via Vite (`VITE_API_PROXY_TARGET=http://127.0.0.1:8000`).

Client: `frontend-*/shared/services/api.ts`

---

## Production

- WSGI: `deploy/gunicorn/gunicorn.conf.py`
- Settings: `DJANGO_SETTINGS_MODULE=camtraffic.settings_production`
- Stack: `deploy/docker/docker-compose.prod.yml`

---

## OpenAPI & interactive docs

When `ENABLE_API_DOCS=True` (default in `DEBUG`):

| URL | Description |
|-----|-------------|
| `/api/schema/` | OpenAPI 3 schema (JSON: `?format=openapi-json`) |
| `/api/docs/` | Swagger UI |
| `/api/redoc/` | ReDoc |

Production: set `ENABLE_API_DOCS=False` in `deploy/env/.env.production`.

**Rate limits** (env): `API_THROTTLE_ANON`, `API_THROTTLE_BURST`, `API_THROTTLE_SUSTAINED`. Login uses separate `LOGIN_RATE_LIMIT_*` middleware.

**Audit:** `python manage.py audit_api_permissions` (or `npm run audit:api` from repo root).

See also: `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `deploy/README.md`
