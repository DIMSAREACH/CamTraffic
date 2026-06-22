# API Specification — CamTraffic

> **Canonical spec:** Thesis PRD §7 — `/api/v1/` prefix  
> **Live backend:** `/api/` (no version prefix yet)  
> **Related:** [PRD.md](PRD.md) · [SYSTEM_FLOW.md](SYSTEM_FLOW.md) · [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)

**Base URL (target):** `https://api.camtraffic.kh/api/v1`  
**Base URL (dev):** `http://127.0.0.1:8000/api/v1`  
**Auth header:** `Authorization: Bearer <access_token>`  
**Response envelope:** `{ "success": true, "data": {...} }` or `{ "success": false, "message": "..." }`

**Legend:** ✅ Live · ⚠️ Partial · ❌ Planned

---

## Version & Routing

| Spec | Current implementation |
| --- | --- |
| `/api/v1/...` | `/api/...` (drop `/v1` segment) |
| `/api/v1/auth/token/refresh/` | `/api/auth/refresh/` |
| `/api/v1/driver/violations/` | Role-filtered `/api/violations/` or `/api/fines/` |
| `/api/v1/admin/dashboard/metrics/` | `/api/dashboard/admin/` |

---

## 7.1. Ingestion Clients (Traffic Cameras)

Automated camera devices push telemetry and violation payloads.

### POST `/api/v1/ingest/telemetry/`

Camera heartbeat — status ping and daily detection counter sync.

**Auth:** Device API key or service token (planned)  
**Status:** ❌ Planned

**Request:**

```json
{
  "camera_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "active",
  "last_ping": "2026-06-19T10:30:00Z",
  "detection_count_today": 142,
  "resolution": "1080p",
  "stream_health": "ok"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "camera_id": "550e8400-e29b-41d4-a716-446655440000",
    "acknowledged_at": "2026-06-19T10:30:01Z"
  }
}
```

**Updates:** `cameras.last_ping`, `cameras.detection_count_today`, `cameras.status`

**Current equivalent:** None — manual camera CRUD via `GET/POST /api/cameras/`

---

### POST `/api/v1/ingest/violation/`

Submit real-time AI violation payload from edge camera or processing unit.

**Auth:** Device API key or service token (planned)  
**Status:** ❌ Planned

**Request (multipart or JSON + image URL):**

```json
{
  "camera_id": "550e8400-e29b-41d4-a716-446655440000",
  "violation_type": "SPEEDING",
  "plate_detected": "2A-1234",
  "speed_detected": 72.5,
  "road_speed_limit": 50,
  "ai_confidence_score": 94.2,
  "bbox_coords": { "sign": [...], "vehicle": [...], "plate": [...] },
  "evidence_photo_url": "/media/evidence/2026/06/frame_001.jpg",
  "detected_at": "2026-06-19T10:29:55Z"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "violation_id": "660e8400-e29b-41d4-a716-446655440001",
    "vehicle_matched": true,
    "routed_to_unknown_queue": false
  }
}
```

**Current equivalent:** `POST /api/ai/detect/` (manual upload / webcam / snapshot poll)

---

## 7.2. Citizen / Driver Client

Authentication, violations, payments, and appeals for registered drivers.

### POST `/api/v1/auth/login/`

Standard user authentication with JWT access + refresh tokens.

**Status:** ✅ → `/api/auth/login/`

**Request:**

```json
{ "email": "driver@example.com", "password": "SecurePass1!" }
```

**Response:**

```json
{
  "success": true,
  "data": {
    "access": "<jwt_access>",
    "refresh": "<jwt_refresh>",
    "user": {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "full_name": "Sok Pisey",
      "email": "driver@example.com",
      "role": "driver"
    }
  }
}
```

---

### POST `/api/v1/auth/register/`

Self-registration for citizen/driver accounts.

**Status:** ✅ → `/api/auth/register/`

**Request:**

```json
{
  "email": "driver@example.com",
  "password": "SecurePass1!",
  "full_name": "Sok Pisey",
  "phone": "+85512345678"
}
```

---

### POST `/api/v1/auth/token/refresh/`

Rotate access token using refresh token.

**Status:** ✅ → `/api/auth/refresh/`

**Request:**

```json
{ "refresh": "<jwt_refresh>" }
```

**Response:**

```json
{ "success": true, "data": { "access": "<new_jwt_access>" } }
```

---

### POST `/api/v1/auth/logout/`

Blacklist refresh token.

**Status:** ✅ → `/api/auth/logout/`

**Request:** `{ "refresh": "<jwt_refresh>" }`

---

### GET/PATCH `/api/v1/auth/profile/`

View and update driver profile.

**Status:** ✅ → `/api/auth/profile/`

---

### POST `/api/v1/auth/change-password/`

**Status:** ✅ → `/api/auth/change-password/`

---

### POST `/api/v1/auth/password-reset/`

Request password reset email.

**Status:** ✅ → `/api/auth/password-reset/`

---

### POST `/api/v1/auth/password-reset/confirm/`

Confirm reset with token + new password.

**Status:** ✅ → `/api/auth/password-reset/confirm/`

---

### POST `/api/v1/driver/kyc/submit/`

Upload National ID and driver's license (front/back) for verification.

**Status:** ❌ Planned

**Request (multipart):**

| Field | Type | Required |
| --- | --- | --- |
| national_id_number | string | yes |
| national_id_photo | file | yes |
| license_photo_front | file | yes |
| license_photo_back | file | yes |

**Updates:** `drivers.national_id`, `drivers.license_photo_front/back`, KYC status

---

### GET `/api/v1/driver/violations/`

Fetch verified infractions mapped to the logged-in driver.

**Status:** ⚠️ → filter `/api/violations/` by role or use `/api/fines/` for issued citations

**Query params:** `?status=confirmed&page=1`

**Response:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "violation_id": "660e8400-e29b-41d4-a716-446655440001",
        "violation_type": "ILLEGAL_LEFT_TURN",
        "status": "confirmed",
        "plate_detected": "2A-1234",
        "evidence_photo_url": "/media/evidence/...",
        "violation_date": "2026-06-15T08:22:00Z",
        "fine": { "fine_id": "...", "amount": 40000, "status": "pending" }
      }
    ]
  }
}
```

---

### GET `/api/v1/driver/fines/`

List own fines with payment status.

**Status:** ✅ → `/api/fines/` (role-filtered to own records for drivers)

---

### GET `/api/v1/driver/fines/{id}/pdf/`

Download fine receipt PDF.

**Status:** ✅ → `/api/fines/{id}/pdf/`

---

### POST `/api/v1/fines/{id}/pay/`

Submit digital payment confirmation with reference code and receipt screenshot.

**Status:** ❌ Planned

**Request (multipart):**

```json
{
  "payment_method": "ABA",
  "payment_reference": "TXN-20260619-88421",
  "payment_screenshot": "<file>"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "fine_id": "...",
    "status": "pending_verification",
    "message": "Receipt submitted. Awaiting officer verification."
  }
}
```

**Updates:** `fines.payment_method`, `fines.payment_reference`, `fines.payment_screenshot`, status → pending verification

---

### POST `/api/v1/appeals/submit/`

Submit formal appeal against a citation; locks fine from escalation while pending.

**Status:** ❌ Planned

**Request:**

```json
{
  "violation_id": "660e8400-e29b-41d4-a716-446655440001",
  "reason": "Vehicle was not mine at the time of the violation. Attached proof of sale."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "appeal_id": "770e8400-e29b-41d4-a716-446655440002",
    "status": "pending",
    "fine_status": "disputed"
  }
}
```

---

### GET `/api/v1/appeals/`

List own appeal history.

**Status:** ❌ Planned

---

### GET/POST `/api/v1/driver/vehicles/`

Manage registered vehicles.

**Status:** ✅ → `/api/vehicles/`

---

### GET `/api/v1/notifications/`

In-app notifications for violations, fines, appeals.

**Status:** ✅ → `/api/notifications/`

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/v1/notifications/` | List notifications |
| POST | `/api/v1/notifications/{id}/read/` | Mark one read |
| POST | `/api/v1/notifications/read/` | Mark all read |

**Current:** `/api/notifications/`, `/api/notifications/{id}/read/`, `/api/notifications/read/`

---

## 7.3. Traffic Police Client

Violation review, unknown vehicle resolution, fine issuance.

### GET `/api/v1/police/dashboard/`

Officer statistics and recent incidents.

**Status:** ✅ → `/api/dashboard/police/`

---

### GET/POST `/api/v1/violations/`

List and create violation records.

**Status:** ✅ → `/api/violations/`

| Method | PRD path | Current | Description |
| --- | --- | --- | --- |
| GET/POST | `/api/v1/violations/` | `/api/violations/` | List/create |
| GET/PATCH/DELETE | `/api/v1/violations/{id}/` | `/api/violations/{id}/` | Detail |
| POST | `/api/v1/violations/evaluate/` | `/api/violations/evaluate/` | Rule engine dry-run |
| GET | `/api/v1/violations/stats/` | `/api/violations/stats/` | Statistics |
| GET | `/api/v1/violations/rules/` | `/api/violations/rules/` | Knowledge base |

---

### GET/PATCH `/api/v1/admin/unknown-vehicles/`

Review unmatched plate queue.

**Status:** ❌ Planned

---

### PATCH `/api/v1/admin/unknown-vehicles/{id}/resolve/`

Link unknown vehicle record to a registered driver profile.

**Status:** ❌ Planned

**Request:**

```json
{
  "driver_id": "550e8400-e29b-41d4-a716-446655440000",
  "vehicle_id": "660e8400-e29b-41d4-a716-446655440001",
  "officer_note": "Manual lookup confirmed owner via registration office."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "unknown_id": "...",
    "is_resolved": true,
    "linked_violation_id": "..."
  }
}
```

---

### GET/POST `/api/v1/fines/`

Issue and manage fines.

**Status:** ✅ → `/api/fines/`

| Method | PRD path | Current | Description |
| --- | --- | --- | --- |
| GET/POST | `/api/v1/fines/` | `/api/fines/` | List/issue |
| PATCH | `/api/v1/fines/{id}/` | `/api/fines/{id}/` | Update status |
| GET | `/api/v1/fines/lookup/?license=` | `/api/fines/lookup/` | Driver lookup |

---

### PATCH `/api/v1/fines/{id}/verify-payment/`

Officer approves or rejects submitted payment receipt.

**Status:** ❌ Planned

**Request:**

```json
{ "approved": true, "officer_note": "ABA reference verified." }
```

---

### POST `/api/v1/appeals/{id}/review/`

Officer upholds or dismisses citizen appeal.

**Status:** ❌ Planned

**Request:**

```json
{
  "decision": "dismissed",
  "officer_comments": "Evidence confirms violation. Appeal rejected."
}
```

---

### GET `/api/v1/dashboard/evidence/`

Unified evidence archive search.

**Status:** ✅ → `/api/dashboard/evidence/?plate=&type=`

---

## 7.4. Administrative Client

System management, analytics, AI model deployment.

### GET `/api/v1/admin/dashboard/metrics/`

Live geographic distributions, violation counts, pending unknown vehicle queue.

**Status:** ⚠️ → `/api/dashboard/admin/`

**Response (target):**

```json
{
  "success": true,
  "data": {
    "total_drivers": 1204,
    "total_vehicles": 3891,
    "total_violations": 842,
    "total_fines": 756,
    "pending_unknown_vehicles": 23,
    "pending_appeals": 8,
    "violations_by_type": { "SPEEDING": 312, "ILLEGAL_LEFT_TURN": 98 },
    "fines_by_status": { "pending": 201, "paid": 489, "overdue": 66 }
  }
}
```

---

### GET `/api/v1/admin/dashboard/report/pdf/`

Analytics PDF export.

**Status:** ✅ → `/api/dashboard/admin/report/pdf/`

---

### GET `/api/v1/admin/dashboard/export.xlsx/`

Excel export — violations + fines.

**Status:** ✅ → `/api/dashboard/enforcement/export.xlsx/`

---

### GET/POST/PATCH/DELETE `/api/v1/admin/users/`

User management.

**Status:** ✅ → `/api/users/`

---

### GET/POST/PATCH/DELETE `/api/v1/admin/cameras/`

Camera deployment management.

**Status:** ✅ → `/api/cameras/`

---

### GET/POST/PATCH/DELETE `/api/v1/admin/roads/`

Road registry management.

**Status:** ✅ → `/api/roads/`

---

### GET/POST/PATCH/DELETE `/api/v1/admin/signs/`

Traffic sign catalog CRUD.

**Status:** ✅ → `/api/signs/`

---

### GET `/api/v1/admin/ai/logs/`

AI detection history with export.

**Status:** ✅ → `/api/ai/logs/`, `/api/ai/logs/export/`

---

### POST `/api/v1/admin/models/deploy/`

Activate new YOLO weights and record operational metrics.

**Status:** ❌ Planned

**Request (multipart):**

```json
{
  "version": "v2.1.0-10class",
  "model_file": "<file>",
  "description": "Retrained on expanded night dataset",
  "accuracy": 93.4,
  "set_active": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "model_id": "...",
    "version": "v2.1.0-10class",
    "is_active": true,
    "previous_active_version": "v2.0.0-10class"
  }
}
```

**Updates:** `ai_model_versions` table; hot-reload `AI_MODEL_PATH`

---

### GET `/api/v1/admin/models/`

List model version history.

**Status:** ❌ Planned

---

### GET `/api/v1/admin/audit-logs/`

Query immutable admin/officer action audit trail.

**Status:** ❌ Planned

**Query params:** `?user_id=&action=&resource=&from=&to=`

---

## 7.5. AI Detection (Shared)

Used by police dashboard and driver learning module.

### POST `/api/v1/ai/detect/`

Full detection pipeline — sign, vehicle, OCR, optional violation.

**Status:** ✅ → `/api/ai/detect/`

**Request (multipart):**

| Field | Type | Description |
| --- | --- | --- |
| image | File | Required — JPEG/PNG frame |
| sign_only | bool | Skip vehicle/OCR/violation |
| live_scan | bool | Stricter live webcam thresholds |
| observed_action | string | Demo: ENTER, TURN_LEFT, TURN_RIGHT, etc. |
| create_violation | bool | Auto-create violation record |
| debug_mode | bool | Return pipeline debug info |

**Response:**

```json
{
  "success": true,
  "data": {
    "sign_name": "No Left Turn",
    "sign_name_km": "ហាមបត់ឆ្វេង",
    "confidence": 92.4,
    "processing_time": 1.24,
    "log_id": 42,
    "vehicles": [{ "class": "car", "confidence": 88.1, "bbox": [120, 80, 340, 280] }],
    "plate": { "text": "2A-1234", "province": "Phnom Penh" },
    "violation": { "created": true, "violation_id": 7 }
  }
}
```

---

### GET `/api/v1/ai/stats/`

Model status, catalog counts, page KPIs.

**Status:** ✅ → `/api/ai/stats/`

---

### POST `/api/v1/ai/tts/`

Khmer/English text-to-speech for sign guidance.

**Status:** ✅ → `/api/ai/tts/`

---

## Error Responses

```json
{
  "success": false,
  "message": "Invalid credentials.",
  "errors": { "email": ["This field is required."] }
}
```

| Code | Meaning |
| --- | --- |
| 400 | Validation error |
| 401 | Missing or invalid JWT |
| 403 | Role not permitted |
| 404 | Resource not found |
| 429 | Rate limit exceeded (planned) |
| 500 | Server error |

---

## Role Access Matrix

| Endpoint group | Admin | Police | Driver | Camera device |
| --- | --- | --- | --- | --- |
| `/ingest/*` | ❌ | ❌ | ❌ | ✅ (planned) |
| `/auth/*` | ✅ | ✅ | ✅ | ❌ |
| `/driver/kyc/*` | ❌ | ❌ | ✅ | ❌ |
| `/driver/violations/` | ✅ | ✅ | ✅ own | ❌ |
| `/fines/` issue | ✅ | ✅ | ❌ | ❌ |
| `/fines/` own + pay | ✅ | ✅ | ✅ | ❌ |
| `/appeals/*` | ✅ review | ✅ review | ✅ submit | ❌ |
| `/violations/` | ✅ | ✅ | ❌ | ❌ |
| `/admin/unknown-vehicles/` | ✅ | ✅ | ❌ | ❌ |
| `/admin/models/*` | ✅ | ❌ | ❌ | ❌ |
| `/admin/audit-logs/` | ✅ | ❌ | ❌ | ❌ |
| `/ai/detect/` | ✅ | ✅ | ✅ | ❌ |
| `/dashboard/admin/` | ✅ | ❌ | ❌ | ❌ |
| `/dashboard/police/` | ❌ | ✅ | ❌ | ❌ |
| `/dashboard/driver/` | ❌ | ❌ | ✅ | ❌ |

---

## Implementation Roadmap

| Priority | Endpoint | Phase |
| --- | --- | --- |
| P1 | `POST /api/v1/ingest/telemetry/` | Phase 5 — Cameras |
| P1 | `POST /api/v1/fines/{id}/pay/` | Phase 8 — Payments |
| P1 | `POST /api/v1/appeals/submit/` | Phase 9 — Appeals |
| P2 | `PATCH /api/v1/admin/unknown-vehicles/{id}/resolve/` | Phase 7 |
| P2 | `POST /api/v1/admin/models/deploy/` | Phase 12 |
| P2 | `GET /api/v1/admin/audit-logs/` | Phase 13 |
| P3 | Migrate all routes to `/api/v1/` prefix | Phase 15 |

Track progress in [TASKS.md](TASKS.md).

---

## Quick Reference — Live Endpoints Today

All paths below omit the `/v1` segment. Prefix with `http://127.0.0.1:8000/api`.

```text
/auth/login/          /auth/register/       /auth/refresh/
/auth/logout/         /auth/profile/        /auth/change-password/
/auth/password-reset/ /auth/password-reset/confirm/

/users/               /vehicles/            /signs/
/violations/          /violations/evaluate/
/fines/               /fines/{id}/pdf/

/ai/detect/           /ai/logs/             /ai/stats/            /ai/tts/

/notifications/       /cameras/             /roads/

/dashboard/admin/     /dashboard/police/    /dashboard/driver/
/dashboard/evidence/  /dashboard/enforcement/export.xlsx/
```

Extended reference: [docs/API.md](docs/API.md)
