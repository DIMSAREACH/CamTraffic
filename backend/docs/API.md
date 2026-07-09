# Backend API Index

Django REST API modules for CamTraffic.

Base URL: `http://localhost:8000/api/v1/`

## System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health/` | Root liveness (Docker) |
| GET | `/health/ready/` | Readiness (Postgres + Redis) |
| GET | `/api/v1/` | API metadata |
| GET | `/api/v1/health/` | API liveness |
| GET | `/api/v1/health/?full=1` | API readiness |
| GET | `/api/v1/monitoring/status/` | Operator monitoring |

## Task 091 — Authentication (`/api/v1/auth/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `login/` | Public | Email + password login |
| POST | `refresh/` | Public | Refresh access token |
| POST | `logout/` | JWT | Blacklist refresh token |
| GET | `me/` | JWT | Current authenticated user |
| POST | `forgot-password/` | Public | Request password reset email |
| POST | `reset-password/` | Public | Reset password with uid + token |
| POST | `change-password/` | JWT | Change password for current user |
| POST | `verify-email/send/` | JWT | Send email verification link |
| POST | `verify-email/` | Public | Confirm email with uid + token |

## Task 092 — Users (`/api/v1/users/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `profile/me/` | JWT | Current user profile |
| PATCH | `profile/me/` | JWT | Update profile fields |
| POST | `profile/me/avatar/` | JWT | Upload avatar (multipart) |
| DELETE | `profile/me/avatar/` | JWT | Remove avatar |
| GET | `management/` | admin | List users |
| POST | `management/` | admin | Create user |
| GET | `management/<id>/` | admin | User detail |
| PATCH | `management/<id>/` | admin | Update user |
| DELETE | `management/<id>/` | admin | Delete user |

Login history: `/api/v1/audit/login-history/` (Task 023).

## Task 093 — Officers (`/api/v1/officers/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `stations/` | admin | Active station catalog |
| GET | `stations/manage/` | admin | List police stations |
| POST | `stations/manage/` | admin | Create police station |
| GET | `stations/manage/<id>/` | admin | Station detail |
| PATCH | `stations/manage/<id>/` | admin | Update station |
| DELETE | `stations/manage/<id>/` | admin | Delete station |
| GET | `management/` | admin | List officers |
| POST | `management/` | admin | Create officer |
| GET | `management/<id>/` | admin | Officer detail |
| PATCH | `management/<id>/` | admin | Update officer |
| DELETE | `management/<id>/` | admin | Delete officer |
| GET | `officer/profile/` | officer | Officer self profile |
| PATCH | `officer/profile/` | officer | Update rank |

## Task 094 — Drivers (`/api/v1/drivers/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `officer/management/` | officer | List drivers |
| POST | `officer/management/` | officer | Create driver |
| GET | `officer/management/<id>/` | officer | Driver detail |
| PATCH | `officer/management/<id>/` | officer | Update driver |
| DELETE | `officer/management/<id>/` | officer | Delete driver |
| GET | `driver/profile/` | driver | Driver self profile |
| PATCH | `driver/profile/` | driver | Update national ID |
| GET | `driver/settings/` | driver | Notification preferences |
| PATCH | `driver/settings/` | driver | Update preferences |

## Task 095 — Vehicles (`/api/v1/vehicles/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `officer/management/` | officer | List vehicles |
| POST | `officer/management/` | officer | Register vehicle |
| GET | `officer/management/<id>/` | officer | Vehicle detail |
| PATCH | `officer/management/<id>/` | officer | Update vehicle |
| DELETE | `officer/management/<id>/` | officer | Delete vehicle |
| GET | `driver/mine/` | driver | List own vehicles |
| GET | `driver/mine/<id>/` | driver | Vehicle detail with violations |

## Remaining apps (Phase 6 — Tasks 096–105)

## Task 096 — Cameras (`/api/v1/cameras/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `management/` | admin | List cameras |
| POST | `management/` | admin | Create camera |
| GET | `management/<id>/` | admin | Camera detail |
| PATCH | `management/<id>/` | admin | Update camera |
| DELETE | `management/<id>/` | admin | Delete camera |
| GET | `live-dashboard/` | admin | Live feed dashboard |
| GET | `officer/live/` | officer | Station live dashboard |
| GET | `health/` | admin | Health monitoring summary |
| POST | `health/<id>/check/` | admin | Run single health check |
| POST | `health/check-all/` | admin | Run all health checks |

## Task 097 — Traffic Signs (`/api/v1/traffic-signs/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `categories/` | admin | Active category catalog |
| GET/POST | `categories/manage/` | admin | List/create categories |
| GET/PATCH/DELETE | `categories/manage/<id>/` | admin | Category detail CRUD |
| GET/POST | `management/` | admin | List/create signs |
| GET/PATCH/DELETE | `management/<id>/` | admin | Sign detail CRUD |

## Task 098 — Detections (`/api/v1/detections/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `monitoring/` | admin | Detection feed |
| GET | `monitoring/summary/` | admin | Aggregate metrics |
| GET | `monitoring/<id>/` | admin | Detection detail |
| GET | `officer/monitoring/` | officer | Station detection feed |
| GET | `officer/monitoring/summary/` | officer | Station metrics |
| GET | `officer/monitoring/<id>/` | officer | Station detection detail |
| GET | `officer/cameras/` | officer | Camera filter options |

## Task 099 — OCR (`/api/v1/ocr/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `results/` | admin | List/create OCR results |
| GET | `results/<id>/` | admin | OCR result detail |
| GET | `detections/<id>/` | admin/officer | OCR by detection |

## Task 100 — Violations (`/api/v1/violations/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `officer/review/` | officer | Violation review queue |
| GET | `officer/review/<id>/` | officer | Review detail |
| POST | `officer/review/<id>/decision/` | officer | Approve/reject |
| GET | `officer/evidence/` | officer | Evidence list |
| GET | `officer/evidence/<id>/` | officer | Evidence detail |
| GET | `driver/mine/` | driver | Violation history |
| GET | `driver/mine/<id>/` | driver | Violation detail |

## Task 101 — Fines (`/api/v1/fines/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `driver/mine/` | driver | Fine list |
| GET | `driver/mine/<id>/` | driver | Fine detail |
| POST | `driver/mine/<id>/pay/` | driver | Pay fine |
| GET | `driver/payments/` | driver | Payment history |
| GET | `driver/payments/<id>/` | driver | Payment receipt |

## Task 102 — Appeals (`/api/v1/appeals/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `driver/appealable/` | driver | Appealable violations |
| GET/POST | `driver/mine/` | driver | List/submit appeals |
| GET | `driver/mine/<id>/` | driver | Appeal detail |
| GET | `officer/review/` | officer | Station appeal queue |
| GET | `officer/review/<id>/` | officer | Appeal review detail |
| POST | `officer/review/<id>/decision/` | officer | Approve/reject appeal |

## Task 103 — Reports (`/api/v1/reports/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `catalog/` | admin | Report catalog |
| GET/POST | `exports/` | admin | List/create exports |
| GET | `exports/<id>/` | admin | Export detail |
| GET | `officer/catalog/` | officer | Station report catalog |
| GET/POST | `officer/exports/` | officer | Station exports |
| GET | `officer/exports/<id>/` | officer | Export detail |

## Task 104 — Notifications (`/api/v1/notifications/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `templates/manage/` | admin | Template list/create |
| GET/PATCH/DELETE | `templates/manage/<id>/` | admin | Template detail CRUD |
| GET | `officer/summary/` | officer | Officer notification summary |
| GET | `officer/` | officer | Officer notifications |
| GET/PATCH | `officer/<id>/` | officer | Notification detail |
| POST | `officer/read-all/` | officer | Mark all read |
| GET | `driver/summary/` | driver | Driver notification summary |
| GET | `driver/` | driver | Driver notifications |
| GET/PATCH | `driver/<id>/` | driver | Notification detail |
| POST | `driver/read-all/` | driver | Mark all read |

## Task 105 — Dashboard (`/api/v1/dashboard/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `stats/` | admin | Admin stats |
| GET | `charts/` | admin | Admin charts |
| GET | `activities/` | admin | Recent activities |
| GET | `ai-summary/` | admin | AI summary |
| GET | `camera-status/` | admin | Camera status |
| GET | `notifications/` | admin | Notification center |
| GET | `analytics/` | admin | Analytics (`?days=`) |
| GET | `officer/stats/` | officer | Officer stats |
| GET | `officer/charts/` | officer | Officer charts |
| GET | `officer/activities/` | officer | Officer activities |
| GET | `officer/camera-status/` | officer | Officer camera status |
| GET | `officer/notifications/` | officer | Officer notifications |
| GET | `driver/stats/` | driver | Driver stats |
| GET | `driver/charts/` | driver | Driver charts |
| GET | `driver/activities/` | driver | Driver activities |
| GET | `driver/notifications/` | driver | Driver notifications |

## Other apps

| App | Base Path | Task |
|-----|-----------|------|
| RBAC | `/api/v1/rbac/` | 013–014 |
| Audit | `/api/v1/audit/` | 055, 023 |
| System | `/api/v1/system/` | 057–058 |

## Phase 11 — System Integration (`/api/v1/integration/`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `cameras/{id}/process-frame/` | admin/officer | Submit camera frame for AI processing |
| GET  | `ai-status/` | admin | Proxy AI service pipeline status |
| GET  | `detections/live-feed/` | admin/officer | SSE stream of new detections |

### `POST /integration/cameras/{id}/process-frame/`

Accepts a multipart `image` file upload. By default dispatches a Celery background task and
returns `{ task_id, camera_id }` with HTTP 202. Append `?sync=1` to run inline and return
the full detection result.

**Response (async)**
```json
{
  "data": {
    "task_id": "abc-123",
    "camera_id": 1
  }
}
```

**Response (sync)**
```json
{
  "data": {
    "camera_id": 1,
    "detection_id": 42,
    "violation_id": 7,
    "officers_notified": 3,
    "driver_notified": true
  }
}
```

### `GET /integration/detections/live-feed/`

Server-Sent Events stream. Query parameters:

| Param | Default | Description |
|-------|---------|-------------|
| `camera_id` | — | Filter to a specific camera |
| `max_events` | 200 | Safety cap on events before stream closes |

Each event is a `DetectionMonitorSerializer` JSON payload.

## Authentication

All endpoints (except public auth endpoints) require:

```
Authorization: Bearer <access_token>
```

Obtain tokens via `POST /api/v1/auth/login/`.

Refresh via `POST /api/v1/auth/refresh/` with the refresh token.

## Standard Response Envelope

Success:
```json
{
  "success": true,
  "data": { ... }
}
```

Error:
```json
{
  "success": false,
  "error": "Human-readable message",
  "code": "ERROR_CODE"
}
```

Django admin: http://localhost:8000/admin/
