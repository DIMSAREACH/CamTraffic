# CamTraffic — Updated ERD (from thesis ERD.pdf)

**Reference:** `System Diagram/ERD.pdf` (original thesis diagram)  
**Updated to match:** CamTraffic Django models (`backend/**/models.py`) — June 2026

Use this document to **redraw your ERD.pdf** in Draw.io, Lucidchart, or Word.

---

## 1. Summary: Your PDF vs Current System

| Status | Count | Details |
|--------|-------|---------|
| **Keep & update fields** | 13 entities | User, Officer, Driver, Role, Permission, RolePermission, UserRole, Vehicle, Road, Camera, TrafficSignal, TrafficViolation, Fine |
| **Add new entities** | 7 entities | TrafficSign, ViolationRule, AIDetectionLog, VehicleTrackingLog, Notification, UserPreference, LoginEvent |
| **Total in updated ERD** | **20 entities** | Full CamTraffic database |

---

## 2. What to ADD to Your ERD.pdf

These are **in the current system** but **missing from your PDF**:

### ⭐ Priority 1 — Must add (core thesis features)

| New entity | Table | Why add |
|------------|-------|---------|
| **TrafficSign** | `traffic_signs` | 236+ Cambodia sign catalog — AI detection knowledge base |
| **ViolationRule** | `violation_rules` | Expert system rules (sign + action → violation) |
| **AIDetectionLog** | `ai_detection_logs` | Every YOLO/Gemini detection session |

### Priority 2 — Should add

| New entity | Table | Why add |
|------------|-------|---------|
| **Notification** | `notifications` | In-app alerts (fine, detection, system) |
| **VehicleTrackingLog** | `vehicle_tracking_logs` | Live webcam vehicle tracking (ByteTrack) |
| **UserPreference** | `user_preferences` | Notification & security settings |
| **LoginEvent** | `login_events` | Login audit trail |

---

## 3. What to FIX in Existing Entities

### User

| Your PDF | Update to (current system) |
|----------|---------------------------|
| `username` | **Remove** — login uses `email` only |
| `password_hash` | `password` |
| `created_date` | `created_at`, `updated_at` |
| — | **Add:** `full_name`, `role` (admin/police/driver), `phone`, `address`, `license_no`, `auth_provider` (email/google/github), `social_uid`, `profile_image`, `is_staff`, `is_superuser` |

### Officer

| Your PDF | Update to |
|----------|-----------|
| `name`, `contact` | **Remove** — stored on `User` (full_name, phone) |
| `officer_id` | `id` (PK) |
| — | Keep: `user_id` (FK, unique), `badge_no`, `rank`, `department`, `status`, `created_at` |

### Driver

| Your PDF | Update to |
|----------|-----------|
| `name`, `phone`, `address` | **Remove** — on `User` |
| `license_expiry_date` | `license_expiry` |
| `driver_id` | `id` (PK) |
| — | Keep: `user_id` (FK, unique), `license_no`, `date_of_birth`, `status`, `created_at` |

### UserRole (your PDF: "User Role")

| Your PDF | Update to |
|----------|-----------|
| `is_officer`, `is_driver` on UserRole | **Remove** — role is on `User.role`; Officer/Driver are separate profile tables |
| — | `UserRole`: `user_id` (FK, unique), `role_id` (FK) — optional RBAC extension |

### Vehicle

| Your PDF | Update to |
|----------|-----------|
| `license_plate` | `plate_number` |
| `type` | `vehicle_type` (car, motorcycle, truck, bus, tuk-tuk) |
| `reg_year` | `year` |
| Only `driver_id` | **Add:** `owner_id` (FK → User) — vehicle owner |
| — | **Add:** `model` (e.g. Toyota Camry), `driver_id` (FK → Driver, optional) |

### Fine

| Your PDF | Update to |
|----------|-----------|
| Only `officer_id`, `violation_id` | **Add:** `driver_id` (FK → User), `police_id` (FK → User) |
| `description` | `reason` (text) |
| `issue_date` | `created_at` |
| `paid_date` | `paid_at` |
| — | **Add:** `evidence_image`, `location`, `vehicle_plate`, `status` (pending/paid/overdue/dismissed) |

### TrafficViolation

| Your PDF | Update to |
|----------|-----------|
| `date` | `violation_date` |
| `evidence_photo_url` | `evidence_image`, `vehicle_evidence_image`, `plate_evidence_image` |
| — | **Add FK:** `road_id`, `ai_detection_log_id` |
| — | **Add:** `violation_type`, `observed_action`, `detected_sign_code`, `detected_class_key`, `updated_at` |
| `status` | draft, pending_review, confirmed, rejected |

### Camera

| Your PDF | Update to |
|----------|-----------|
| `location` (text) | Use `road_id` + optional `latitude`, `longitude` |
| `type` | `camera_type` (fixed, ptz, speed) |
| — | **Add:** `name`, `code` (unique), `frame_source_url`, `updated_at` |

### Road

| Your PDF | Update to |
|----------|-----------|
| `length` | `length_km` |
| `type` | `road_type` (highway, urban, rural, intersection) |
| — | **Add:** `latitude`, `longitude`, `updated_at` |

### TrafficSignal

| Your PDF | Update to |
|----------|-----------|
| `location`, `type` | Use `road_id`, `signal_code`; remove generic type |
| `signal_id` | `id` (PK) |
| — | **Add:** `created_at`; unique (`road_id`, `signal_code`) |

---

## 4. Updated ERD — Complete Entity List with Attributes

Copy these boxes into your diagram tool.

### USER & SECURITY

```
┌─────────────────────────────────────┐
│ USER (users)                        │
├─────────────────────────────────────┤
│ PK  id                              │
│ UK  email                           │
│     password                        │
│     full_name                       │
│     role (admin|police|driver)      │
│     phone, address                  │
│     license_no                      │
│     auth_provider (email|google|github)│
│     social_uid                      │
│     profile_image                   │
│     is_active, is_staff, is_superuser│
│     last_login                      │
│     created_at, updated_at          │
└─────────────────────────────────────┘
         │1                    │1
         │                     │
    ┌────▼────┐           ┌────▼────┐
    │ OFFICER │           │ DRIVER  │
    │(officers)│          │(drivers)│
    ├─────────┤           ├─────────┤
    │PK id    │           │PK id    │
    │FK user_id (UK)      │FK user_id (UK)│
    │   badge_no (UK)     │   license_no (UK)│
    │   rank, department  │   license_expiry│
    │   status            │   date_of_birth │
    │   created_at        │   status        │
    └─────────┘           │   created_at    │
                          └─────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ USER_PREFERENCE │  │ LOGIN_EVENT     │  │ USER_ROLE       │
│(user_preferences)│ │(login_events)   │  │(rbac_user_roles)│
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│PK id            │  │PK id            │  │PK id            │
│FK user_id (UK)  │  │FK user_id       │  │FK user_id (UK)  │
│ notify_fines    │  │ ip_address      │  │FK role_id       │
│ notify_detections│ │ user_agent      │  └────────┬────────┘
│ notify_alerts   │  │ device_label    │           │N
│ two_factor_enabled│ │ status         │           │1
│ updated_at      │  │ created_at      │      ┌────▼────┐
└─────────────────┘  └─────────────────┘      │ ROLE    │
                                              │(rbac_roles)│
┌──────────────┐  ┌──────────────────┐       ├─────────┤
│ PERMISSION   │  │ ROLE_PERMISSION  │       │PK id    │
│(rbac_permissions)│ │(rbac_role_permissions)│ │ role_name│
├──────────────┤  ├──────────────────┤       │ status  │
│PK id         │  │PK id             │       │ description│
│ perm_name(UK)│  │FK role_id        │       └─────────┘
│ action_type  │  │FK permission_id  │
│ resource     │  └──────────────────┘
│ description  │
└──────────────┘
```

### TRAFFIC KNOWLEDGE (NEW — add to your PDF)

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│ TRAFFIC_SIGN                │····│ VIOLATION_RULE              │
│ (traffic_signs)             │     │ (violation_rules)           │
├─────────────────────────────┤     ├─────────────────────────────┤
│ PK  id                      │     │ PK  id                      │
│     sign_name               │     │     sign_class_key          │
│     sign_name_km            │     │     prohibited_action       │
│     sign_name_en            │     │     violation_type          │
│ UK  sign_code               │     │     title, description      │
│     description, description_en│  │     default_fine_amount     │
│     guidance, guidance_en   │     │     is_active               │
│     image                   │     │     created_at              │
│     category                │     └─────────────────────────────┘
│     penalty                 │       ···· = logical link via
│     rules (JSON)            │            sign_class_key / sign_code
│     created_at              │
└─────────────────────────────┘
```

### VEHICLE

```
┌─────────────────────────────┐
│ VEHICLE (vehicles)          │
├─────────────────────────────┤
│ PK  id                      │
│ FK  owner_id → User         │
│ FK  driver_id → Driver      │
│ UK  plate_number            │
│     vehicle_type            │
│     model, color, year      │
│     engine_no, chassis_no   │
│     registration_expiry     │
│     status                  │
│     created_at              │
└─────────────────────────────┘
```

### AI DETECTION (NEW — add to your PDF)

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│ AI_DETECTION_LOG            │────►│ VEHICLE_TRACKING_LOG        │
│ (ai_detection_logs)         │ 1:N │ (vehicle_tracking_logs)     │
├─────────────────────────────┤     ├─────────────────────────────┤
│ PK  id                      │     │ PK  id                      │
│ FK  user_id → User          │     │ FK  user_id → User          │
│     uploaded_image          │     │ FK  detection_log_id        │
│     detected_sign           │     │     track_session_id        │
│     confidence              │     │     track_id                │
│     description, guidance   │     │     vehicle_type            │
│     processing_time         │     │     confidence, bbox (JSON)   │
│     review_status           │     │     created_at              │
│     model_version           │     └─────────────────────────────┘
│     detected_vehicles (JSON)│
│     vehicle_count           │
│     detected_plate          │
│     plate_confidence        │
│     vehicle_snapshot        │
│     plate_snapshot          │
│     created_at              │
└──────────────┬──────────────┘
               │ 1:N
               ▼
        (links to TrafficViolation)
```

### ENFORCEMENT

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│ TRAFFIC_VIOLATION           │────►│ FINE (fines)                │
│ (traffic_violations)        │ 1:1 │                             │
├─────────────────────────────┤     ├─────────────────────────────┤
│ PK  id                      │     │ PK  id                      │
│ FK  driver_id → Driver      │     │ FK  driver_id → User        │
│ FK  vehicle_id → Vehicle    │     │ FK  police_id → User        │
│ FK  officer_id → Officer    │     │ FK  violation_id (UK)       │
│ FK  camera_id → Camera      │     │     amount, reason          │
│ FK  road_id → Road          │     │     status, due_date        │
│ FK  ai_detection_log_id     │     │     payment_method          │
│     violation_type          │     │     evidence_image          │
│     observed_action         │     │     location, vehicle_plate │
│     detected_sign_code      │     │     created_at, paid_at     │
│     detected_class_key      │     └─────────────────────────────┘
│     violation_date          │
│     location, description   │
│     evidence_image          │
│     vehicle_evidence_image  │
│     plate_evidence_image    │
│     status                  │
│     created_at, updated_at  │
└─────────────────────────────┘
```

### INFRASTRUCTURE

```
┌──────────────┐
│ ROAD (roads) │
├──────────────┤
│ PK id        │
│    name      │
│    road_type │
│    length_km │
│    speed_limit│
│    region, city│
│    latitude, longitude│
│    status    │
│    created_at, updated_at│
└──────┬───────┘
       │ 1:N
   ┌───┴────────────┐
   ▼                ▼
┌──────────┐  ┌─────────────────┐
│ CAMERA   │  │ TRAFFIC_SIGNAL  │
│(cameras) │  │(traffic_signals)│
├──────────┤  ├─────────────────┤
│PK id     │  │PK id            │
│FK road_id│  │FK road_id       │
│   name   │  │   signal_code   │
│UK code   │  │   cycle_duration│
│ camera_type│ │ timing_sequence (JSON)│
│ model    │  │ latitude, longitude│
│ latitude, longitude│ │ status │
│ frame_source_url│ │ created_at │
│ status   │  └─────────────────┘
│ installed_date│
│ created_at, updated_at│
└──────────┘
```

### NOTIFICATION (NEW)

```
┌─────────────────────────────┐
│ NOTIFICATION (notifications)│
├─────────────────────────────┤
│ PK  id                      │
│ FK  user_id → User          │
│     title, message          │
│     type (fine|system|detection|alert)│
│     is_read                 │
│     created_at              │
└─────────────────────────────┘
```

---

## 5. Updated Relationships (All Lines for Your Diagram)

| # | From | Relationship | To | Cardinality |
|---|------|--------------|-----|-------------|
| 1 | User | has profile | Officer | 1 : 0..1 |
| 2 | User | has profile | Driver | 1 : 0..1 |
| 3 | User | owns | Vehicle | 1 : N |
| 4 | Driver | assigned to | Vehicle | 1 : N |
| 5 | User | performs | AIDetectionLog | 1 : N |
| 6 | AIDetectionLog | contains | VehicleTrackingLog | 1 : N |
| 7 | AIDetectionLog | may create | TrafficViolation | 1 : N |
| 8 | Driver | commits | TrafficViolation | 1 : N |
| 9 | Officer | records | TrafficViolation | 1 : N |
| 10 | Vehicle | involved in | TrafficViolation | 1 : N |
| 11 | Camera | captures | TrafficViolation | 1 : N |
| 12 | Road | location of | TrafficViolation | 1 : N |
| 13 | TrafficViolation | generates | Fine | 1 : 0..1 |
| 14 | User (driver) | receives | Fine | 1 : N |
| 15 | User (police) | issues | Fine | 1 : N |
| 16 | Road | has | Camera | 1 : N |
| 17 | Road | has | TrafficSignal | 1 : N |
| 18 | User | receives | Notification | 1 : N |
| 19 | User | has | UserPreference | 1 : 1 |
| 20 | User | has | LoginEvent | 1 : N |
| 21 | Role | grants | Permission | N : M (via RolePermission) |
| 22 | User | assigned | Role | 1 : 0..1 (via UserRole) |
| 23 | TrafficSign | linked to | ViolationRule | N : M (logical, dashed) |

---

## 6. Updated Mermaid ERD (Full — for export to image)

Paste into [mermaid.live](https://mermaid.live) to export PNG/SVG for thesis.

```mermaid
erDiagram
    USER ||--o| OFFICER : "has profile"
    USER ||--o| DRIVER : "has profile"
    USER ||--o| USER_PREFERENCE : "has"
    USER ||--o{ LOGIN_EVENT : "logs"
    USER ||--o| USER_ROLE : "assigned"
    USER ||--o{ VEHICLE : "owns"
    USER ||--o{ AI_DETECTION_LOG : "detects"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ FINE : "driver receives"
    USER ||--o{ FINE : "police issues"

    ROLE ||--o{ ROLE_PERMISSION : "includes"
    PERMISSION ||--o{ ROLE_PERMISSION : "granted by"
    ROLE ||--o{ USER_ROLE : "assigned to"

    DRIVER ||--o{ VEHICLE : "drives"
    DRIVER ||--o{ TRAFFIC_VIOLATION : "commits"

    OFFICER ||--o{ TRAFFIC_VIOLATION : "records"

    ROAD ||--o{ CAMERA : "has"
    ROAD ||--o{ TRAFFIC_SIGNAL : "has"
    ROAD ||--o{ TRAFFIC_VIOLATION : "at"

    CAMERA ||--o{ TRAFFIC_VIOLATION : "captures"

    VEHICLE ||--o{ TRAFFIC_VIOLATION : "involved"

    AI_DETECTION_LOG ||--o{ VEHICLE_TRACKING_LOG : "tracks"
    AI_DETECTION_LOG ||--o{ TRAFFIC_VIOLATION : "triggers"

    TRAFFIC_VIOLATION ||--o| FINE : "generates"

    TRAFFIC_SIGN }o..o{ VIOLATION_RULE : "sign_class_key"

    USER {
        bigint id PK
        string email UK
        string full_name
        string role
        string auth_provider
        datetime created_at
    }

    OFFICER {
        bigint id PK
        bigint user_id FK_UK
        string badge_no UK
        string rank
        string status
    }

    DRIVER {
        bigint id PK
        bigint user_id FK_UK
        string license_no UK
        date license_expiry
        string status
    }

    VEHICLE {
        bigint id PK
        bigint owner_id FK
        bigint driver_id FK
        string plate_number UK
        string vehicle_type
        string model
    }

    TRAFFIC_SIGN {
        bigint id PK
        string sign_name
        string sign_name_km
        string sign_code UK
        string category
        json rules
    }

    VIOLATION_RULE {
        bigint id PK
        string sign_class_key
        string prohibited_action
        string violation_type
        decimal default_fine_amount
    }

    AI_DETECTION_LOG {
        bigint id PK
        bigint user_id FK
        string detected_sign
        float confidence
        string detected_plate
        json detected_vehicles
    }

    TRAFFIC_VIOLATION {
        bigint id PK
        bigint driver_id FK
        bigint ai_detection_log_id FK
        string violation_type
        string status
        datetime violation_date
    }

    FINE {
        bigint id PK
        bigint driver_id FK
        bigint violation_id FK_UK
        decimal amount
        string status
    }

    ROAD {
        bigint id PK
        string name
        string road_type
        int speed_limit
    }

    CAMERA {
        bigint id PK
        bigint road_id FK
        string code UK
        string camera_type
    }

    NOTIFICATION {
        bigint id PK
        bigint user_id FK
        string title
        string type
        bool is_read
    }
```

---

## 7. Simplified ERD (8 entities — if PDF is too crowded)

If your thesis page is small, use this **core subset** plus a note “see appendix for full schema”:

```text
User ── Driver ── Vehicle
  │       │
  │       └── TrafficViolation ── Fine
  │
  └── AIDetectionLog ── TrafficViolation

TrafficSign ··· ViolationRule

Road ── Camera ── TrafficViolation
```

Entities: **User, Driver, Vehicle, TrafficSign, ViolationRule, AIDetectionLog, TrafficViolation, Fine, Road, Camera** (10 boxes)

---

## 8. Step-by-Step: Update Your ERD.pdf

1. **Open** `ERD.pdf` in Draw.io / Lucidchart (import PDF or redraw).
2. **Add 3 new boxes** (highlight in color): TrafficSign, ViolationRule, AIDetectionLog.
3. **Add dashed line** TrafficSign ··· ViolationRule (label: `sign_class_key`).
4. **Add line** User → AIDetectionLog (1:N, label: `detects`).
5. **Add line** AIDetectionLog → TrafficViolation (1:N, label: `triggers`).
6. **Add FK** on TrafficViolation: `ai_detection_log_id`, `road_id`.
7. **Update User** box: remove `username`, add `full_name`, `role`, `auth_provider`.
8. **Update Vehicle** box: add `owner_id`, rename `license_plate` → `plate_number`.
9. **Update Fine** box: add `driver_id`, rename `officer_id` → `police_id`.
10. **Optional:** add Notification, UserPreference, LoginEvent on second page.
11. **Export** as PDF → replace `System Diagram/ERD.pdf`.

---

## 9. Comparison Checklist

| Item | In your PDF? | In current system? | Action |
|------|-------------|-------------------|--------|
| User | Yes | Yes | Update fields |
| Officer | Yes | Yes | Remove name/contact |
| Driver | Yes | Yes | Remove name/phone/address |
| Role, Permission, RolePermission, UserRole | Yes | Yes | Fix UserRole (no is_officer/is_driver) |
| Vehicle | Yes | Yes | Add owner_id, fix field names |
| Road, Camera, TrafficSignal | Yes | Yes | Update field names |
| TrafficViolation | Yes | Yes | Add AI + road FKs, evidence fields |
| Fine | Yes | Yes | Add driver_id, fix police_id |
| **TrafficSign** | **No** | **Yes** | **ADD** |
| **ViolationRule** | **No** | **Yes** | **ADD** |
| **AIDetectionLog** | **No** | **Yes** | **ADD** |
| Notification | No | Yes | Add (optional) |
| VehicleTrackingLog | No | Yes | Add (optional) |
| UserPreference | No | Yes | Add (optional) |
| LoginEvent | No | Yes | Add (optional) |

---

## 10. Figure Caption (Updated)

**English:**  
Figure X: Updated Entity Relationship Diagram of the CamTraffic database, including traffic sign catalog, AI detection logs, violation rules (expert system), enforcement records, and road infrastructure.

**Khmer:**  
រូបភាព X៖ គំរូ Entity Relationship Diagram (ERD) បានធ្វើបច្ចុប្បន្នភាព នៃមូលដ្ឋានទិន្នន័យ CamTraffic រួមមាន каталогសញ្ញាចរាចរណ៍ កំណត់ត្រាការរកឃើញ AI � правилаរំលោភ (ប្រព័ន្ធ Expert) កំណត់ត្រាការរំលោភ និងហេដ្ឋារចនាសម្ព័ន្ធ។

---

## 11. Related Files

| File | Purpose |
|------|---------|
| [ERD.md](./ERD.md) | Full ERD reference (18 entities) |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | System architecture |
| `backend/**/models.py` | Source of truth for attributes |
| Original PDF | `Reference(...)/System Diagram/ERD.pdf` |

---

*Updated from thesis ERD.pdf — aligned with CamTraffic codebase, June 2026.*
