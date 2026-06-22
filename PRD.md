# CamTraffic — Product Requirements Document (PRD)

**Project Title:** CamTraffic  
**Design and Development of an AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia**

> **Document status:** Updated **2026-06-19** — sourced from thesis PRD PDF and aligned with current codebase.  
> **Related docs:** [README.md](README.md) · [TASKS.md](TASKS.md) · [SYSTEM_FLOW.md](SYSTEM_FLOW.md) · [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) · [API_SPEC.md](API_SPEC.md) · [TECH_STACK.md](TECH_STACK.md)

---

## 1. Document Overview & Objectives

### 1.1. Problem Statement

The current traffic management and law enforcement system in Cambodia relies heavily on manual intervention and traditional policing methods. Traffic officers monitor checkpoints or manually check speed limits using handheld radar devices. This approach is labor-intensive, prone to human error, lacks real-time responsiveness, and makes it challenging to scale coverage across growing urban centers like Phnom Penh. Consequently, traffic sign violations, speeding, and unauthorized vehicle usage often go undetected, compromising overall road safety.

### 1.2. Project Objectives

The objective of CamTraffic is to establish an automated, intelligent, and highly reliable system to detect traffic signs and enforce traffic laws using advanced Artificial Intelligence (AI) and Computer Vision.

| Objective | Description | Status |
| --- | --- | --- |
| **Automated AI Detection** | Utilize deep learning models to identify traffic signs, vehicle license plates, speeds, and violations automatically | ⚠️ Partial — signs, vehicles, plates implemented; speed detection planned |
| **Centralized Database & Core API** | Deploy a robust, scalable backend using Django REST Framework and PostgreSQL to record violations, manage system entities, and process payments | ⚠️ Partial — core API + DB done; payment processing planned |
| **Real-Time Dashboards** | Provide traffic law enforcement authorities with real-time tracking, statistics, and alert capabilities | ⚠️ Partial — dashboards + in-app alerts; WebSocket/email planned |
| **Transparency & Accountability** | Enable citizens to verify violations, pay fines digitally, and lodge structured appeals against errors | ⚠️ Partial — view fines/violations done; digital payment + appeals planned |

---

## 2. User Roles & System Actors

The system supports a **Role-Based Access Control (RBAC)** model implemented through specific backend groups and permissions.

### 2.1. System Administrator (Admin)

- Manages user records, roles, and granular system permissions
- Deploys, updates, and monitors active AI model versions
- Audits system activity logs for operational security

**Implementation:** ✅ Admin portal (`frontend-admin/:5174`) · user CRUD · analytics · AI logs · reports  
**Pending:** AI model versioning UI · audit logs table

### 2.2. Traffic Police Officer / Reviewer

- Monitors live road statistics and incident feeds via the web dashboard
- Verifies AI-flagged violations and resolves cases involving unknown or unlinked vehicle license plates
- Approves or dismisses fine disputes and records notes on citations

**Implementation:** ✅ Police portal · violation review · fine issuance · evidence archive  
**Pending:** Unknown vehicle queue · appeal review workflow

### 2.3. Citizen / Driver

- Registers a unique user account linked to their government National ID and Driver's License
- Tracks registered vehicles and views active or historic traffic violations
- Receives instant notifications, handles digital payment of fines, or files official violation appeals

**Implementation:** ✅ Registration · vehicle CRUD · view fines/violations · in-app notifications  
**Pending:** KYC (National ID + license upload) · digital payment · appeals

### 2.4. Traffic Camera (Hardware Entity)

- Acts as an automated ingestion actor that continuously streams visual data to the AI unit and pings the system to verify status

**Implementation:** ⚠️ Partial — camera CRUD + snapshot URL poll · browser webcam  
**Pending:** RTSP streaming · heartbeat telemetry · ingest API

### Role mapping (current codebase)

| PRD role | DB value | Portal |
| --- | --- | --- |
| System Administrator | `admin` | `frontend-admin` (:5174) |
| Traffic Police Officer | `police` | `frontend-user` (:5173) |
| Citizen / Driver | `driver` | `frontend-user` (:5173) |

---

## 3. Functional Requirements & System Modules

### 3.1. Authentication & Profile Management

| Requirement | Description | Status |
| --- | --- | --- |
| **Secure Auth Flow** | JWT with token blacklisting on logout | ✅ Done |
| **Role Enforcement** | Dynamic access controls separating driver vs law enforcement interfaces | ✅ Done |
| **KYC Profile Verification** | Citizens upload Driver's License (front/back) and National ID for approval before verification status updates | ❌ Not started |

**Current endpoints:** `POST /api/auth/login/`, `/register/`, `/refresh/`, `/logout/`, `/change-password/`, `/password-reset/`  
**OAuth:** Google + GitHub on user portal (optional)

---

### 3.2. AI Processing & Computer Vision Unit

| Requirement | Description | Status |
| --- | --- | --- |
| **Object Detection Core** | YOLOv8 to capture and classify traffic signs and monitor vehicles; target accuracy ≥ 92% | ⚠️ 10-class thesis model deployed; ≥92% benchmark pending |
| **Computer Vision Stream Analytics** | Process real-time video/imagery from street cameras; isolate bounding box coordinates (`bbox_coords`) for violations | ⚠️ Upload + webcam + snapshot; full RTSP stream pending |
| **Metadata Extraction** | Extract `plate_detected`, `speed_detected`; compare against `road_speed_limit` rules | ⚠️ Plate OCR done; speed detection planned |
| **Model Versioning** | Admin interface to track model history, evaluation metrics, and toggle active weights | ❌ Not started |

**Current pipeline:** OpenCV → YOLOv8 sign (`best.pt`) → YOLOv8n COCO vehicles → EasyOCR plates → rule engine  
**API:** `POST /api/ai/detect/` · optional Gemini Vision hybrid fallback

---

### 3.3. Traffic Camera & Road Infrastructure Management

| Requirement | Description | Status |
| --- | --- | --- |
| **Camera Ingestion** | Track camera models, status, resolution, geo-coordinates, RTSP/HTTPS stream URLs | ⚠️ CRUD + `frame_source_url` + lat/lng; RTSP pending |
| **Heartbeat & Telemetry** | Monitor via `last_ping` timestamps and `detection_count_today` | ❌ Not started |
| **Road Registry** | Group infrastructure by city/region grids for regional traffic patterns | ⚠️ Roads table exists; regional analytics partial |

**Current endpoints:** `GET/POST /api/cameras/`, `/api/roads/`

---

### 3.4. Traffic Violation Ingestion & Resolution

| Requirement | Description | Status |
| --- | --- | --- |
| **Automatic Logging** | Persist infractions with evidence photos, violation types, AI confidence levels | ✅ Done |
| **Unknown Plate Pipeline** | Route unmatched plates to `unknown_vehicles` queue for officer review and linking | ❌ Not started |

**Violation types (rule engine):** No Left/Right Turn, No U-Turn, No Parking, No Entry, Stop Sign, Speed Limit, Red Light (planned)

**Current endpoints:** `GET/POST /api/violations/`, `POST /api/violations/evaluate/`

---

### 3.5. Fine Citation & Payment Subsystem

| Requirement | Description | Status |
| --- | --- | --- |
| **Automatic Fine Generation** | Calculate fine values based on violation thresholds | ⚠️ Demo / pipeline mode |
| **Payment Lifecycle** | Track citations: Issued → Paid, Overdue, or Disputed with due dates | ⚠️ Status workflow done; disputed state pending |
| **Digital Proof Processing** | User selects payment method, enters reference code, uploads receipt for officer audit | ❌ Not started |

**Current endpoints:** `GET/POST /api/fines/`, `PATCH /api/fines/{id}/`, `GET /api/fines/{id}/pdf/`

---

### 3.6. Notification, Alerts, & Appeals Management

| Requirement | Description | Status |
| --- | --- | --- |
| **Instant Alerts** | WebSocket or email alerts for violations, fine due dates, resolution updates | ⚠️ In-app notifications only |
| **Dispute Processing** | Citizens submit appeals; fine locked until officer upholds or dismisses | ❌ Not started |

**Current endpoints:** `GET /api/notifications/`, mark read endpoints

---

## 4. System Architecture & Tech Stack

```text
[Traffic Camera] ---> Ingests Stream ---> [AI Processing Unit (YOLOv8)]
                              |
              Sends Bounding Boxes / Plate Data
                              |
                              v
[React.js Frontend Client] <--- HTTPS (REST) ---> [Django REST Framework]
                              - Caching & Queues (Redis)          [planned]
                              - Web Server (Nginx / Gunicorn)     [documented]
                              |
                              v
                      [PostgreSQL Database]
```

| Component | Technology | Status |
| --- | --- | --- |
| **Backend Framework** | Django / Django REST Framework | ✅ Done |
| **Database** | PostgreSQL (spatial extensions if needed) | ✅ Done (SQLite dev mode) |
| **In-Memory Caching** | Redis for sessions, analytics, live notifications | ❌ Planned |
| **Frontend** | React.js — responsive admin + public interfaces | ✅ Dual portals (admin + user) |
| **Infrastructure** | Docker containerization | ❌ Planned |
| **AI / CV** | YOLOv8, OpenCV, EasyOCR, ByteTrack | ✅ Done |
| **Auth** | JWT (SimpleJWT) + optional OAuth | ✅ Done |

See [TECH_STACK.md](TECH_STACK.md) and [SYSTEM_FLOW.md](SYSTEM_FLOW.md) for extended architecture detail.

### Current detection pipeline (implemented)

```text
               [Capture Input Frame]
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
  [YOLOv8 Sign Model]       [YOLOv8 COCO + ByteTrack]
  (10-class thesis)         (Vehicles on live webcam)
         │                             │
         ├─────────────────────────────┘
         ▼
  [Decision Router] ──(low conf)──► [Gemini Vision] (optional)
         │
         ▼
  [EasyOCR Plate Pipeline] ──► [Province lookup]
         │
         ▼
  [Violation Rule Engine] ──► [Evidence capture]
         │
         ▼
  [PostgreSQL] ──► [React Dashboards]
```

---

## 5. Non-Functional Requirements

### 5.1. Performance & Scalability

| Requirement | Target | Current |
| --- | --- | --- |
| **API Response Time** | Read endpoints < 200ms | ✅ Typical dev performance met |
| **High-Frequency Ingest** | Multi-threaded camera telemetry without bottlenecks | ❌ Ingest API not implemented |
| **High-Volume Ingestion** | Simultaneous image uploads from distributed cameras | ⚠️ Single-request upload path works |

### 5.2. Security, Compliance, & Audit Trail

| Requirement | Target | Current |
| --- | --- | --- |
| **Encryption Standards** | HTTPS (SSL/TLS) via Nginx reverse proxy | ❌ Production HTTPS planned |
| **Data Protection (DPIA)** | Shield vehicle owner and driver identity from unauthorized visibility | ⚠️ RBAC enforced; DPIA documentation in thesis |
| **Immutable Audit Trail** | `audit_logs` table — admin/officer actions, JSONB old/new values, IP addresses | ❌ Not implemented |

**Implemented security:** Password hashing · JWT blacklist on logout · role-based API permissions · CORS whitelist

### 5.3. Reliability & Localization

| Requirement | Target | Current |
| --- | --- | --- |
| **Availability** | 99.9% uptime for citizen and monitoring dashboards | ❌ Production deployment pending |
| **Localization** | Full English + Khmer support for drivers and officers | ✅ i18n in both frontends |

### 5.4. AI Accuracy

| Requirement | Target | Current |
| --- | --- | --- |
| **Model accuracy** | ≥ 92% real-world detection accuracy | ⚠️ 10-class thesis model; formal mAP evaluation pending |
| **Live webcam stability** | Stable sign names without flicker | ✅ 3/5 frame vote + conf ≥ 0.50 |

---

## 6. PostgreSQL Database Schema Design

The production database schema maps to PostgreSQL relational structures optimized for index performance and clean foreign-key references.

> **Note:** Thesis PRD specifies UUID primary keys. Current Django implementation uses BIGINT auto-increment PKs — functionally equivalent, migration to UUID is optional. Full schema reference: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

### 6.1. Core Identity & RBAC Tables

#### Table: `roles`

Stores authorization levels within the platform.

| Column | Type | Notes |
| --- | --- | --- |
| role_id | uuid (PK) | `rbac_roles.id` in current impl |
| role_name | varchar(100) UNIQUE | |
| description | text | |
| status | boolean | |
| created_date | timestamptz | |
| assigned_date | timestamptz | |

#### Table: `role_permissions`

Many-to-Many mapping of granular actions across platform roles.

| Column | Type | Notes |
| --- | --- | --- |
| id | bigint (PK, IDENTITY) | |
| role_id | uuid (FK → roles) | |
| permission_id | uuid | |
| **Constraint** | UNIQUE (role_id, permission_id) | |

**Status:** ✅ RBAC tables implemented · `User.role` also used directly for portal access

---

### 6.2. Driver & Vehicle Registry

#### Table: `drivers`

Verified citizen/driver profile.

| Column | Type | Notes |
| --- | --- | --- |
| driver_id | uuid (PK) | |
| user_id | uuid (UNIQUE) | FK → users |
| license_no | varchar(50) UNIQUE | |
| name | varchar(200) | |
| phone | varchar(20) | |
| date_of_birth | date | |
| address | text | |
| national_id | varchar(50) | ❌ Not in current model |
| license_expiry_date | date | ✅ `license_expiry` |
| license_photo_front | varchar(100) | ❌ KYC planned |
| license_photo_back | varchar(100) | ❌ KYC planned |
| status | varchar(20) | |
| created_date | timestamptz | |

#### Table: `vehicles`

Registered vehicles in Cambodia.

| Column | Type | Notes |
| --- | --- | --- |
| vehicle_id | uuid (PK) | |
| driver_id | uuid (FK → drivers) | Current: `owner_id` → users |
| license_plate | varchar(20) | ✅ `plate_number` |
| type | varchar(20) | ✅ `vehicle_type` |
| color | varchar(50) | ✅ |
| make | varchar(100) | — model field used |
| model | varchar(100) | ✅ |
| chassis_no | varchar(100) | ❌ Planned |
| engine_no | varchar(100) | ❌ Planned |
| reg_year | integer | ✅ `year` |
| registration_expiry | date | ❌ Planned |
| registration_photo | varchar(100) | ❌ Planned |

**Status:** ✅ Core driver + vehicle tables · KYC and registration document fields pending

---

### 6.3. Infrastructure & Monitoring Tables

#### Table: `roads`

| Column | Type | Notes |
| --- | --- | --- |
| road_id | uuid (PK) | |
| status | varchar(30) | |
| city | varchar(100) | |
| region | varchar(100) | |
| latitude | numeric(10,7) | |
| longitude | numeric(10,7) | |
| created_date | timestamptz | |

#### Table: `cameras`

| Column | Type | Notes |
| --- | --- | --- |
| camera_id | uuid (PK) | |
| road_id | uuid (FK → roads) | |
| location | text | |
| type | varchar(20) | |
| status | varchar(20) | |
| model | varchar(100) | |
| stream_url | text | ✅ `frame_source_url` |
| resolution | varchar(10) | ❌ Planned |
| latitude | numeric(10,7) | ✅ |
| longitude | numeric(10,7) | ✅ |
| installed_date | date | ❌ Planned |
| last_ping | timestamptz | ❌ Planned |
| detection_count_today | integer | ❌ Planned |
| created_date | timestamptz | |

**Status:** ✅ Roads + cameras CRUD · heartbeat/telemetry fields pending

---

### 6.4. Enforcement & Citation Tables

#### Table: `traffic_violations`

Central registry of AI-captured or manually flagged violations.

| Column | Type | Notes |
| --- | --- | --- |
| violation_id | uuid (PK) | |
| vehicle_id | uuid (FK → vehicles) | |
| camera_id | uuid (FK → cameras) | |
| evidence_photo_url | text | ✅ `evidence_image` |
| description | text | |
| officer_note | text | ✅ `notes` |
| dismissal_reason | varchar(200) | |
| status | varchar(20) | draft / pending_review / confirmed / rejected |
| violation_type | varchar(30) | |
| ai_confidence_score | numeric(5,2) | |
| plate_detected | varchar(20) | |
| speed_detected | numeric(6,2) | ❌ Planned |
| road_speed_limit | integer | ❌ Planned |
| bbox_coords | jsonb | ✅ stored in detection pipeline |
| created_date | timestamptz | |
| updated_date | timestamptz | |

#### Table: `unknown_vehicles`

Fallback queue for unmatched license plates.

| Column | Type | Notes |
| --- | --- | --- |
| unknown_id | uuid (PK) | ❌ Not implemented |
| plate_detected | varchar(20) | |
| camera_id | uuid (FK → cameras) | |
| violation_type | varchar(30) | |
| evidence_photo_url | text | |
| ai_confidence_score | numeric(5,2) | |
| is_resolved | boolean | |
| resolved_by_id | uuid | |
| detected_at | timestamptz | |

#### Table: `fines`

Financial penalties against verified violations.

| Column | Type | Notes |
| --- | --- | --- |
| fine_id | uuid (PK) | |
| violation_id | uuid (FK, UNIQUE) | ✅ OneToOne link |
| officer_id | uuid | ✅ `police_id` |
| amount | numeric(12,2) | |
| status | varchar(20) | pending / paid / overdue / dismissed |
| issue_date | timestamptz | ✅ `created_at` |
| due_date | date | ✅ |
| paid_date | timestamptz | ✅ `paid_at` |
| payment_method | varchar(20) | ✅ field exists |
| payment_reference | varchar(200) | ❌ Planned |
| payment_screenshot | varchar(100) | ❌ Planned |
| description | text | ✅ `reason` |
| officer_note | text | |
| created_date | timestamptz | |
| updated_date | timestamptz | |

#### Table: `violation_appeals`

Citizen dispute tickets.

| Column | Type | Notes |
| --- | --- | --- |
| appeal_id | uuid (PK) | ❌ Not implemented |
| violation_id | uuid (FK → traffic_violations) | |
| driver_id | uuid (FK → drivers) | |
| reason | text | |
| status | varchar(20) | |
| submitted_date | timestamptz | |
| review_date | timestamptz | |
| reviewed_by_id | uuid | |
| officer_comments | text | |

**Status:** ✅ Violations + fines core · unknown vehicles + appeals pending

---

### 6.5. System Operations & Performance Management

#### Table: `ai_model_versions`

| Column | Type | Notes |
| --- | --- | --- |
| model_id | uuid (PK) | ❌ Not implemented |
| version | varchar(50) UNIQUE | |
| model_file | varchar(100) | |
| description | text | |
| accuracy | numeric(5,2) | |
| is_active | boolean | |
| uploaded_by_id | uuid | |
| uploaded_date | timestamptz | |

#### Table: `audit_logs`

| Column | Type | Notes |
| --- | --- | --- |
| log_id | uuid (PK) | ❌ Not implemented |
| user_id | uuid (INDEXED) | |
| action | varchar(50) | |
| resource | varchar(100) | |
| resource_id | varchar(100) | |
| ip_address | inet | |
| timestamp | timestamptz | |
| old_value | jsonb | |
| new_value | jsonb | |
| extra_data | jsonb | |

#### Table: `notifications`

| Column | Type | Notes |
| --- | --- | --- |
| notification_id | uuid (PK) | |
| user_id | uuid | ✅ Implemented |
| type | varchar(30) | fine / system / detection / alert |
| title | varchar(200) | |
| message | text | |
| is_read | boolean | |
| related_object_id | varchar(100) | ❌ Planned |
| related_object_type | varchar(50) | ❌ Planned |
| created_date | timestamptz | |

---

## 7. Primary API Integration Plan

The Django REST backend exposes endpoints structured for different operational clients.

> **Note:** Thesis PRD uses `/api/v1/` prefix. Current implementation uses `/api/` — see [API_SPEC.md](API_SPEC.md) for live endpoints.

### 7.1. Ingestion Clients (Traffic Cameras)

| Method | Endpoint (PRD) | Description | Status |
| --- | --- | --- | --- |
| POST | `/api/v1/ingest/telemetry/` | Camera status ping + `detection_count_today` sync | ❌ Planned |
| POST | `/api/v1/ingest/violation/` | Real-time AI payload with image, metadata, speed, plate | ❌ Planned |

**Current equivalent:** `POST /api/ai/detect/` (manual upload / webcam / snapshot)

---

### 7.2. Citizen Mobile / Web Client Endpoints

| Method | Endpoint (PRD) | Description | Status |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/login/` | User authentication with token rotation | ✅ `/api/auth/login/` |
| POST | `/api/v1/auth/token/refresh/` | Refresh access token | ✅ `/api/auth/refresh/` |
| GET | `/api/v1/driver/violations/` | Verified infractions for logged-in driver | ⚠️ Via fines/violations list (role-filtered) |
| POST | `/api/v1/fines/{id}/pay/` | Payment confirmation + receipt upload | ❌ Planned |
| POST | `/api/v1/appeals/submit/` | Submit appeal; freeze fine escalation | ❌ Planned |

---

### 7.3. Administrative Web Dashboards

| Method | Endpoint (PRD) | Description | Status |
| --- | --- | --- | --- |
| GET | `/api/v1/admin/dashboard/metrics/` | Live metrics, violation counts, unknown vehicle queue | ⚠️ `/api/dashboard/admin/` |
| PATCH | `/api/v1/admin/unknown-vehicles/{id}/resolve/` | Link unknown vehicle to driver profile | ❌ Planned |
| POST | `/api/v1/admin/models/deploy/` | Activate new YOLO weights + record metrics | ❌ Planned |

---

### 7.4. Currently Implemented API Summary

| Module | Base path | Status |
| --- | --- | --- |
| Authentication | `/api/auth/` | ✅ |
| Users | `/api/users/` | ✅ |
| Vehicles | `/api/vehicles/` | ✅ |
| Traffic Signs | `/api/signs/` | ✅ |
| Violations | `/api/violations/` | ✅ |
| Fines | `/api/fines/` | ✅ |
| AI Detection | `/api/ai/` | ✅ |
| Notifications | `/api/notifications/` | ✅ |
| Infrastructure | `/api/cameras/`, `/api/roads/` | ✅ |
| Dashboard | `/api/dashboard/` | ✅ |

Full reference: [API_SPEC.md](API_SPEC.md)

---

## 8. Implementation Progress Summary

| Module | PRD requirement | Progress |
| --- | --- | --- |
| Authentication & RBAC | JWT, roles, permissions | ✅ ~100% |
| KYC verification | National ID + license upload | ❌ 0% |
| AI sign detection | YOLOv8 ≥92% accuracy | ⚠️ ~70% |
| Vehicle + plate OCR | Detection + EasyOCR | ⚠️ ~75% |
| Camera management | CRUD + stream + heartbeat | ⚠️ ~50% |
| Violation engine | Auto-log + evidence | ⚠️ ~65% |
| Unknown vehicle queue | Officer resolution | ❌ 0% |
| Fine management | Issue + status + PDF | ⚠️ ~70% |
| Payment processing | Receipt upload + verify | ❌ 0% |
| Appeals | Submit + review workflow | ❌ 0% |
| Notifications | In-app + email/WebSocket | ⚠️ ~30% |
| AI model admin | Deploy + version history | ❌ 0% |
| Audit logs | Immutable action trail | ❌ 0% |
| Deployment | Docker + Redis + Nginx | ❌ ~10% |

**Overall:** ~53% — see [TASKS.md](TASKS.md) for phase-by-phase checklist.

---

## 9. Success Metrics (Thesis / Defense)

| Metric | Target | Notes |
| --- | --- | --- |
| Sign detection mAP@0.5 | ≥ 92% (PRD) / ≥ 90% (thesis) | Evaluate with `scripts/audit_detection_pipeline.py` |
| Live webcam stability | 3/5 frame agreement | Reduces wrong-name flicker |
| E2E pipeline | Camera → AI → violation → fine → dashboard | [DEMO_SCRIPT.md](DEMO_SCRIPT.md) |
| API test pass rate | 100% critical paths | `python manage.py test` |
| Dashboard completeness | All core modules navigable | Admin + user portals |

---

## 10. Document Index

| File | Description |
| --- | --- |
| [README.md](README.md) | Project entry point — start here |
| [PRD.md](PRD.md) | This document |
| [PLAN.md](PLAN.md) | Implementation & rollout plan |
| [TASKS.md](TASKS.md) | Phase 1–16 development checklist |
| [SYSTEM_FLOW.md](SYSTEM_FLOW.md) | End-to-end workflow diagrams |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Tables and relationships (implementation) |
| [API_SPEC.md](API_SPEC.md) | REST API reference (implementation) |
| [TECH_STACK.md](TECH_STACK.md) | Technology stack |
| [TASK.md](TASK.md) | Detailed defense tracker |
| [DEMO_SCRIPT.md](DEMO_SCRIPT.md) | Defense demonstration script |
| [docs/ERD.md](docs/ERD.md) | Full entity-relationship diagram |

---

## 11. Conclusion

CamTraffic addresses Cambodia's need for scalable, automated traffic law enforcement by combining **YOLOv8 computer vision**, a **deterministic violation rule engine**, and a **Django REST API** with **React dashboards** for administrators, traffic police, and citizens. The thesis PRD defines the full production vision — including KYC, payment processing, appeals, camera telemetry, and audit logging — while the current codebase (~53% complete) delivers a defensible prototype with working sign detection, violation evaluation, fine management, and bilingual dashboards. Remaining PRD items are tracked in [TASKS.md](TASKS.md).
