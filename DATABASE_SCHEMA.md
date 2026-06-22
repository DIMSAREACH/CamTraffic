# Database Schema — CamTraffic

> **Canonical spec:** Thesis PRD (PostgreSQL, UUID primary keys)  
> **Runtime authority:** Django models in `backend/*/models.py` + migrations  
> **Related:** [PRD.md](PRD.md) §6 · [docs/ERD.md](docs/ERD.md)

PostgreSQL in production · SQLite for local development (`USE_SQLITE=True`).

**Legend:** ✅ Implemented · ⚠️ Partial · ❌ Planned

---

## Schema Overview

```text
roles ──< role_permissions >── permissions
  │
  └──< user_roles >── users ──1:1── drivers ──< vehicles
                          │              │
                          │              └──< traffic_violations >──1:1── fines
                          │                         │
                          │                         └──< violation_appeals
                          │
                          ├──< notifications
                          └──< audit_logs

roads ──< cameras ──< unknown_vehicles
  │
  └──< traffic_violations

ai_model_versions (standalone, admin-managed)
```

---

## 6.1. Core Identity & RBAC

### `roles`

Stores authorization levels within the platform.

| Column | Type | Constraints | Impl. |
| --- | --- | --- | --- |
| role_id | uuid | PRIMARY KEY | ⚠️ `rbac_roles.id` (BIGINT) |
| role_name | varchar(100) | UNIQUE, NOT NULL | ✅ |
| description | text | | ✅ |
| status | boolean | DEFAULT true | ✅ |
| created_date | timestamptz | DEFAULT now() | ✅ `created_at` |
| assigned_date | timestamptz | | ❌ |

**Django table:** `rbac_roles`

---

### `permissions`

Granular platform actions (referenced by `role_permissions`).

| Column | Type | Constraints | Impl. |
| --- | --- | --- | --- |
| permission_id | uuid | PRIMARY KEY | ⚠️ `rbac_permissions.id` (BIGINT) |
| permission_name | varchar(100) | UNIQUE | ✅ `name` |
| resource | varchar(100) | | ✅ `resource` |
| action | varchar(50) | | ✅ `action` |
| description | text | | ✅ |
| created_date | timestamptz | | ✅ |

**Django table:** `rbac_permissions`

---

### `role_permissions`

Many-to-Many mapping of roles to permissions.

| Column | Type | Constraints | Impl. |
| --- | --- | --- | --- |
| id | bigint | PRIMARY KEY, IDENTITY | ✅ |
| role_id | uuid | FK → roles.role_id | ⚠️ BIGINT FK |
| permission_id | uuid | FK → permissions.permission_id | ⚠️ BIGINT FK |
| — | — | UNIQUE (role_id, permission_id) | ✅ |

**Django table:** `rbac_role_permissions`

---

### `users`

Central authentication account (extends PRD via Django `AbstractUser`).

| Column | Type | Constraints | Impl. |
| --- | --- | --- | --- |
| user_id | uuid | PRIMARY KEY | ⚠️ `users.id` (BIGINT) |
| email | varchar(254) | UNIQUE, NOT NULL | ✅ |
| password | varchar(128) | NOT NULL | ✅ (hashed) |
| full_name | varchar(255) | NOT NULL | ✅ |
| role | varchar(20) | admin \| police \| driver | ✅ |
| phone | varchar(20) | | ✅ |
| address | text | | ✅ |
| profile_image | varchar(100) | | ✅ |
| is_active | boolean | DEFAULT true | ✅ |
| created_date | timestamptz | | ✅ `created_at` |
| updated_date | timestamptz | | ✅ `updated_at` |

**Django table:** `users` · Portal access also via `User.role` directly (RBAC tables are extended modeling).

---

### `user_roles`

User ↔ role assignment junction.

| Column | Type | Constraints | Impl. |
| --- | --- | --- | --- |
| id | bigint | PRIMARY KEY | ✅ |
| user_id | uuid | FK → users, UNIQUE | ⚠️ BIGINT FK |
| role_id | uuid | FK → roles | ⚠️ BIGINT FK |

**Django table:** `rbac_user_roles`

---

## 6.2. Driver & Vehicle Registry

### `drivers`

Verified citizen/driver profile with KYC fields.

| Column | Type | Constraints | Impl. |
| --- | --- | --- | --- |
| driver_id | uuid | PRIMARY KEY | ⚠️ `drivers.id` (BIGINT) |
| user_id | uuid | FK → users, UNIQUE | ✅ |
| license_no | varchar(50) | UNIQUE, NOT NULL | ✅ |
| name | varchar(200) | | ⚠️ via `users.full_name` |
| phone | varchar(20) | | ⚠️ via `users.phone` |
| date_of_birth | date | | ✅ |
| address | text | | ⚠️ via `users.address` |
| national_id | varchar(50) | UNIQUE | ❌ |
| license_expiry_date | date | | ✅ `license_expiry` |
| license_photo_front | varchar(100) | media path | ❌ KYC |
| license_photo_back | varchar(100) | media path | ❌ KYC |
| status | varchar(20) | active \| inactive \| suspended | ✅ |
| created_date | timestamptz | | ✅ `created_at` |

**Django table:** `drivers`

---

### `vehicles`

Registered vehicles in Cambodia.

| Column | Type | Constraints | Impl. |
| --- | --- | --- | --- |
| vehicle_id | uuid | PRIMARY KEY | ⚠️ `vehicles.id` (BIGINT) |
| driver_id | uuid | FK → drivers.driver_id | ⚠️ `owner_id` → users |
| license_plate | varchar(20) | UNIQUE, NOT NULL | ✅ `plate_number` |
| type | varchar(20) | car \| motorcycle \| truck \| bus | ✅ `vehicle_type` |
| color | varchar(50) | | ✅ |
| make | varchar(100) | | ❌ |
| model | varchar(100) | | ✅ |
| chassis_no | varchar(100) | | ❌ |
| engine_no | varchar(100) | | ❌ |
| reg_year | integer | | ✅ `year` |
| registration_expiry | date | | ❌ |
| registration_photo | varchar(100) | media path | ❌ |
| status | varchar(20) | active \| inactive | ✅ |
| created_date | timestamptz | | ✅ `created_at` |

**Django table:** `vehicles`

---

## 6.3. Infrastructure & Monitoring

### `roads`

Road segments monitored by enforcement networks.

| Column | Type | Constraints | Impl. |
| --- | --- | --- | --- |
| road_id | uuid | PRIMARY KEY | ⚠️ `roads.id` (BIGINT) |
| name | varchar(200) | | ✅ |
| status | varchar(30) | active \| inactive | ⚠️ implicit |
| city | varchar(100) | | ❌ |
| region | varchar(100) | | ❌ |
| road_type | varchar(30) | | ✅ |
| speed_limit | integer | km/h | ✅ |
| latitude | numeric(10,7) | | ⚠️ via `location` text |
| longitude | numeric(10,7) | | ⚠️ via `location` text |
| created_date | timestamptz | | ✅ `created_at` |

**Django table:** `roads`

---

### `cameras`

Physical camera units capturing traffic flows.

| Column | Type | Constraints | Impl. |
| --- | --- | --- | --- |
| camera_id | uuid | PRIMARY KEY | ⚠️ `cameras.id` (BIGINT) |
| road_id | uuid | FK → roads.road_id | ✅ |
| location | text | | ✅ `name` + location fields |
| type | varchar(20) | fixed \| ptz \| mobile | ✅ `camera_type` |
| status | varchar(20) | active \| inactive \| offline | ✅ |
| model | varchar(100) | hardware model | ❌ |
| stream_url | text | RTSP / HTTPS URL | ✅ `frame_source_url` |
| resolution | varchar(10) | e.g. 1080p | ❌ |
| latitude | numeric(10,7) | | ✅ |
| longitude | numeric(10,7) | | ✅ |
| installed_date | date | | ❌ |
| last_ping | timestamptz | heartbeat timestamp | ❌ |
| detection_count_today | integer | DEFAULT 0 | ❌ |
| created_date | timestamptz | | ✅ `created_at` |

**Django table:** `cameras`

---

## 6.4. Enforcement & Citation

### `traffic_violations`

Central registry of AI-captured or manually flagged violations.

| Column | Type | Constraints | Impl. |
| --- | --- | --- | --- |
| violation_id | uuid | PRIMARY KEY | ⚠️ `traffic_violations.id` (BIGINT) |
| driver_id | uuid | FK → drivers | ✅ |
| vehicle_id | uuid | FK → vehicles | ✅ |
| camera_id | uuid | FK → cameras | ✅ |
| road_id | uuid | FK → roads | ✅ |
| ai_detection_log_id | uuid | FK → ai_detection_logs | ✅ |
| evidence_photo_url | text | HD evidence image | ✅ `evidence_image` |
| description | text | | ✅ |
| officer_note | text | | ✅ `notes` |
| dismissal_reason | varchar(200) | | ❌ |
| status | varchar(20) | draft \| pending_review \| confirmed \| rejected | ✅ |
| violation_type | varchar(30) | Speeding, Red Light, etc. | ✅ |
| ai_confidence_score | numeric(5,2) | 0.00–100.00 | ⚠️ via AI log |
| plate_detected | varchar(20) | OCR result | ⚠️ via AI log |
| speed_detected | numeric(6,2) | km/h | ❌ |
| road_speed_limit | integer | km/h at capture | ❌ |
| bbox_coords | jsonb | AI bounding boxes | ✅ in pipeline |
| observed_action | varchar(50) | TURN_LEFT, ENTER, etc. | ✅ (impl. extension) |
| detected_class_key | varchar(80) | YOLO class key | ✅ (impl. extension) |
| violation_date | timestamptz | | ✅ |
| created_date | timestamptz | | ✅ `created_at` |
| updated_date | timestamptz | | ✅ `updated_at` |

**Django table:** `traffic_violations`

---

### `unknown_vehicles`

Fallback queue when license plates cannot be matched to registered drivers.

| Column | Type | Constraints | Impl. |
| --- | --- | --- | --- |
| unknown_id | uuid | PRIMARY KEY | ❌ |
| plate_detected | varchar(20) | NOT NULL | ❌ |
| camera_id | uuid | FK → cameras | ❌ |
| violation_type | varchar(30) | | ❌ |
| evidence_photo_url | text | | ❌ |
| ai_confidence_score | numeric(5,2) | | ❌ |
| is_resolved | boolean | DEFAULT false | ❌ |
| resolved_by_id | uuid | FK → users (officer) | ❌ |
| detected_at | timestamptz | | ❌ |

**Django table:** not created — Phase 7 in [TASKS.md](TASKS.md)

---

### `fines`

Financial penalties issued against verified violations.

| Column | Type | Constraints | Impl. |
| --- | --- | --- | --- |
| fine_id | uuid | PRIMARY KEY | ⚠️ `fines.id` (BIGINT) |
| violation_id | uuid | FK → traffic_violations, UNIQUE | ✅ OneToOne |
| driver_id | uuid | FK → users (driver) | ✅ |
| officer_id | uuid | FK → users (police) | ✅ `police_id` |
| amount | numeric(12,2) | NOT NULL | ✅ |
| status | varchar(20) | pending \| paid \| overdue \| disputed \| dismissed | ⚠️ no `disputed` yet |
| issue_date | timestamptz | | ✅ `created_at` |
| due_date | date | | ✅ |
| paid_date | timestamptz | | ✅ `paid_at` |
| payment_method | varchar(20) | e.g. ABA, Wing | ✅ field exists |
| payment_reference | varchar(200) | transaction ref code | ❌ |
| payment_screenshot | varchar(100) | receipt image path | ❌ |
| description | text | citation reason | ✅ `reason` |
| officer_note | text | | ❌ |
| created_date | timestamptz | | ✅ `created_at` |
| updated_date | timestamptz | | ❌ |

**Django table:** `fines`

---

### `violation_appeals`

Citizen dispute tickets against citations.

| Column | Type | Constraints | Impl. |
| --- | --- | --- | --- |
| appeal_id | uuid | PRIMARY KEY | ❌ |
| violation_id | uuid | FK → traffic_violations | ❌ |
| fine_id | uuid | FK → fines | ❌ (locks fine while pending) |
| driver_id | uuid | FK → drivers | ❌ |
| reason | text | NOT NULL | ❌ |
| status | varchar(20) | pending \| upheld \| dismissed | ❌ |
| submitted_date | timestamptz | | ❌ |
| review_date | timestamptz | | ❌ |
| reviewed_by_id | uuid | FK → users (officer) | ❌ |
| officer_comments | text | | ❌ |

**Django table:** not created — Phase 9 in [TASKS.md](TASKS.md)

---

## 6.5. System Operations & Performance

### `ai_model_versions`

Tracks deployed YOLOv8 weight versions.

| Column | Type | Constraints | Impl. |
| --- | --- | --- | --- |
| model_id | uuid | PRIMARY KEY | ❌ |
| version | varchar(50) | UNIQUE, NOT NULL | ⚠️ string in AI logs only |
| model_file | varchar(100) | weights path | ⚠️ `ai/weights/best.pt` |
| description | text | | ❌ |
| accuracy | numeric(5,2) | evaluation metric | ❌ |
| is_active | boolean | DEFAULT false | ❌ |
| uploaded_by_id | uuid | FK → users | ❌ |
| uploaded_date | timestamptz | | ❌ |

**Django table:** not created — Phase 12 in [TASKS.md](TASKS.md)

---

### `audit_logs`

Immutable audit trail for admin and officer actions.

| Column | Type | Constraints | Impl. |
| --- | --- | --- | --- |
| log_id | uuid | PRIMARY KEY | ❌ |
| user_id | uuid | FK → users, INDEXED | ❌ |
| action | varchar(50) | CREATE \| UPDATE \| DELETE | ❌ |
| resource | varchar(100) | e.g. fines, violations | ❌ |
| resource_id | varchar(100) | | ❌ |
| ip_address | inet | client IP | ❌ |
| timestamp | timestamptz | DEFAULT now() | ❌ |
| old_value | jsonb | state before change | ❌ |
| new_value | jsonb | state after change | ❌ |
| extra_data | jsonb | optional context | ❌ |

**Django table:** not created — Phase 13 · partial: `login_events` exists

---

### `notifications`

Real-time system notifications.

| Column | Type | Constraints | Impl. |
| --- | --- | --- | --- |
| notification_id | uuid | PRIMARY KEY | ⚠️ `notifications.id` (BIGINT) |
| user_id | uuid | FK → users | ✅ |
| type | varchar(30) | fine \| violation \| detection \| alert \| system | ✅ |
| title | varchar(200) | NOT NULL | ✅ |
| message | text | NOT NULL | ✅ |
| is_read | boolean | DEFAULT false | ✅ |
| related_object_id | varchar(100) | polymorphic FK | ❌ |
| related_object_type | varchar(50) | e.g. fine, violation | ❌ |
| created_date | timestamptz | | ✅ `created_at` |

**Django table:** `notifications`

---

## Implementation Extensions (not in thesis PRD PDF)

These tables exist in the current codebase and support the thesis prototype.

### `traffic_signs`

Cambodian sign catalog — bilingual knowledge base for AI + rule engine.

| Column | Type | Impl. |
| --- | --- | --- |
| id | BIGINT PK | ✅ |
| sign_name, sign_name_km, sign_name_en | varchar | ✅ |
| sign_code | varchar(20) UNIQUE | ✅ |
| category | enum | ✅ |
| rules | JSONB | ✅ |
| penalty, description, guidance | text | ✅ |
| image | varchar(100) | ✅ |

---

### `violation_rules`

Expert-system rules — logical link via `sign_class_key` (no FK to traffic_signs).

| Column | Type | Impl. |
| --- | --- | --- |
| id | BIGINT PK | ✅ |
| sign_class_key | varchar(80) | ✅ |
| prohibited_action | varchar(50) | ✅ |
| violation_type | varchar(50) UNIQUE | ✅ |
| default_fine_amount | decimal | ✅ |
| is_active | boolean | ✅ |

---

### `ai_detection_logs`

Every AI detection session (upload, webcam, camera snapshot).

| Column | Type | Impl. |
| --- | --- | --- |
| id | BIGINT PK | ✅ |
| user_id | FK → users | ✅ |
| uploaded_image | varchar(100) | ✅ |
| detected_sign | varchar(150) | ✅ |
| confidence | float | ✅ |
| detected_plate | varchar(30) | ✅ |
| detected_vehicles | JSONB | ✅ |
| processing_time | float | ✅ |
| model_version | varchar(50) | ✅ |
| created_at | timestamptz | ✅ |

---

### `vehicle_tracking_logs`

ByteTrack IDs during live webcam sessions.

| Column | Type | Impl. |
| --- | --- | --- |
| id | BIGINT PK | ✅ |
| user_id, ai_detection_log_id | FK | ✅ |
| track_session | varchar(64) | ✅ |
| track_id | integer | ✅ |
| vehicle_class | varchar(30) | ✅ |
| bbox | JSONB | ✅ |

---

### `officers`

Police profile extension (1:1 with users where role = police).

| Column | Type | Impl. |
| --- | --- | --- |
| id | BIGINT PK | ✅ |
| user_id | FK UNIQUE | ✅ |
| badge_no | varchar(50) UNIQUE | ✅ |
| rank, department | varchar | ✅ |
| status | varchar(20) | ✅ |

---

### Supporting tables

| Table | Purpose | Impl. |
| --- | --- | --- |
| `user_preferences` | Notification + security settings | ✅ |
| `login_events` | Login audit trail | ✅ |
| `traffic_signals` | Signal timing at intersections | ✅ |

---

## Key Relationships

```text
users 1──1 drivers 1──N vehicles
users 1──1 officers
users 1──N fines (as driver or police)
users 1──N notifications
users 1──N ai_detection_logs

roads 1──N cameras 1──N traffic_violations
roads 1──N traffic_violations

vehicles 1──N traffic_violations
drivers 1──N traffic_violations

traffic_violations 1──1 fines
traffic_violations 1──N violation_appeals (planned)

cameras 1──N unknown_vehicles (planned)

traffic_signs ←──logical──→ violation_rules (sign_class_key)
ai_detection_logs 1──N traffic_violations
ai_detection_logs 1──N vehicle_tracking_logs
```

---

## AI → Database Flow

```text
Camera / Webcam / Upload
        ↓
YOLO sign detect → class_key
        ↓
traffic_signs catalog lookup
        ↓
ai_detection_logs INSERT
        ↓
OCR plate_detected → vehicles.license_plate → drivers
        ↓
[match found]  violation_rules + observed_action → traffic_violations
[no match]     unknown_vehicles queue (planned)
        ↓
fines INSERT + notifications INSERT
        ↓
[dispute] violation_appeals INSERT (planned)
```

---

## PK Type Migration Note

| Spec | Current Django |
| --- | --- |
| UUID primary keys (PRD) | BIGINT auto-increment |
| `created_date` naming | `created_at` |
| `license_plate` | `plate_number` |
| `stream_url` | `frame_source_url` |

Migration to UUID is optional for thesis defense. New tables (`unknown_vehicles`, `violation_appeals`, `audit_logs`, `ai_model_versions`) should follow PRD UUID convention when implemented.

---

## Status Summary

| Domain | Tables | Implemented |
| --- | --- | --- |
| RBAC & Identity | roles, permissions, role_permissions, users, user_roles | ⚠️ 5/5 (BIGINT PKs) |
| Driver & Vehicle | drivers, vehicles | ⚠️ 2/2 (KYC fields pending) |
| Infrastructure | roads, cameras | ⚠️ 2/2 (telemetry pending) |
| Enforcement | traffic_violations, fines | ⚠️ 2/2 |
| Enforcement (planned) | unknown_vehicles, violation_appeals | ❌ 0/2 |
| Operations | ai_model_versions, audit_logs, notifications | ⚠️ 1/3 |
| Extensions | traffic_signs, violation_rules, ai_detection_logs, etc. | ✅ 6/6 |
