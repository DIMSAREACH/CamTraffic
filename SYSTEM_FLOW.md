# System Flow — CamTraffic

**AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia**

> **Document status:** Updated **2026-06-19** — real-life traffic enforcement flows (not CRUD-only).  
> **Related:** [PRD.md](PRD.md) · [PLAN.md](PLAN.md) · [TASKS.md](TASKS.md) · [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) · [API_SPEC.md](API_SPEC.md)

**Legend:** ✅ Implemented · ⚠️ Partial · ❌ Planned

---

## System Flow Overview

The system follows a **real-life traffic enforcement lifecycle** — from camera capture through AI detection, officer review, fine issuance, citizen notification, payment or appeal, and case closure.

```text
Traffic Camera
      ↓
AI Detection
      ↓
Traffic Sign Detection
      ↓
License Plate Detection
      ↓
Violation Analysis
      ↓
Generate Violation
      ↓
Officer Review
      ↓
Generate Fine
      ↓
Citizen Notification
      ↓
Payment / Appeal
      ↓
Case Closed
```

---

## Final Architecture

```text
React Frontend
       ↓
Django REST API
       ↓
PostgreSQL

Traffic Camera
       ↓
YOLOv8 + OCR
       ↓
Violation Engine
       ↓
Fine System
       ↓
Notification System

Admin Dashboard
Officer Dashboard
Citizen Dashboard
```

**Recommended build order (minimize risk, demo early):**

```text
Auth → Vehicle → Camera → AI Detection → Violation → Fine → Notification → Appeal → Dashboard → Deployment
```

---

# Phase 1: Citizen Registration Flow

```text
Register Account
      ↓
Login
      ↓
Complete Profile
      ↓
Upload National ID
      ↓
Upload Driver License
      ↓
Officer Verification
      ↓
Verified User
```

### Modules

| Module | Status | Notes |
| --- | --- | --- |
| Authentication | ✅ | JWT, refresh, logout, OAuth |
| User Profile | ✅ | View/edit profile, photo upload |
| KYC Verification | ❌ | National ID + license front/back |

**Tables:** `users`, `drivers`  
**API:** `POST /api/auth/register/`, `/api/auth/login/`, `/api/auth/profile/`  
**Planned:** `POST /api/v1/driver/kyc/submit/`

---

# Phase 2: Vehicle Registration Flow

```text
Citizen Login
      ↓
Add Vehicle
      ↓
Enter Plate Number
      ↓
Upload Vehicle Documents
      ↓
Officer Verify
      ↓
Vehicle Activated
```

### Tables

| Table | Status | Notes |
| --- | --- | --- |
| `drivers` | ✅ | Profile linked to user |
| `vehicles` | ⚠️ | CRUD done; document upload + officer verify pending |

**API:** `GET/POST /api/vehicles/`, `DELETE /api/vehicles/{id}/`  
**Planned fields:** `registration_photo`, `registration_expiry`, officer verification status

---

# Phase 3: Camera Management Flow

```text
Admin Login
      ↓
Add Road
      ↓
Add Camera
      ↓
Assign Camera To Road
      ↓
Activate Camera
      ↓
Camera Starts Streaming
```

### Tables

| Table | Status | Notes |
| --- | --- | --- |
| `roads` | ✅ | Road registry |
| `cameras` | ⚠️ | CRUD + snapshot URL; RTSP stream + heartbeat pending |

**API:** `GET/POST /api/roads/`, `/api/cameras/`  
**Planned:** `POST /api/v1/ingest/telemetry/` (heartbeat, `last_ping`, `detection_count_today`)

**Current streaming:** Browser webcam + IP camera snapshot poll (not full RTSP server-side yet)

---

# Phase 4: AI Detection Flow

This is the **core innovation** of the thesis project.

```text
Camera Stream
      ↓
Capture Frame
      ↓
YOLOv8 Detects
      ├── Traffic Sign
      ├── Vehicle
      └── License Plate
      ↓
OCR Read Plate
      ↓
Store Detection Result
```

### Detailed pipeline (implemented)

```text
Input Frame
    │
    ├─ Upload image ──────────────────────────────┐
    ├─ Browser webcam (getUserMedia) ─────────────┤
    └─ IP camera snapshot URL ────────────────────┤
                                                  ▼
                                    OpenCV Preprocessing
                                    (resize, ROI crop, enhance)
                                                  │
                    ┌─────────────────────────────┴─────────────────────────────┐
                    ▼                                                           ▼
           YOLOv8 Sign Model (best.pt)                              YOLOv8n Vehicle Model
           10-class Cambodian signs                                 car, motorcycle, bus, truck
                    │                                                           │
                    └─────────────────────────────┬─────────────────────────────┘
                                                  │
                              Low confidence? ────┼──► Gemini Vision (optional hybrid)
                                                  │
                                                  ▼
                                         EasyOCR Plate Pipeline
                                         (Latin plates + province lookup)
                                                  │
                                                  ▼
                                         ai_detection_logs saved
```

### Example detection output

```text
Plate:           2AB-1234
Detected Sign:   Speed Limit 40
Detected Speed:  60 km/h          ← planned (speed from camera calibration)
Violation:       Speeding         ← via rule engine when speed > limit
```

**Status:** ✅ Sign + vehicle + plate OCR · ❌ Speed detection from camera  
**API:** `POST /api/ai/detect/`  
**Flags:** `sign_only`, `live_scan`, `observed_action`, `create_violation`, `debug_mode`  
**Table:** `ai_detection_logs`, `vehicle_tracking_logs` (ByteTrack on live webcam)

---

# Phase 5: Violation Processing Flow

```text
AI Detection
      ↓
Violation Logic Engine
      ↓
Create Violation Record
      ↓
Save Evidence Image
      ↓
Save Confidence Score
```

### Rule engine logic

```text
Detected Sign (class_key / sign_code)
        ↓
Cross-reference traffic_signs catalog (rules, penalty, bilingual names)
        ↓
ViolationRule lookup (sign_class_key + prohibited_action)
        ↓
evaluate_violation() — deterministic expert system
        ↓
traffic_violations INSERT
```

### Example — speeding (planned full CV path)

```text
Speed Limit  = 40 km/h   (from sign or road.speed_limit)
Vehicle Speed = 60 km/h  (from camera calibration — planned)

60 > 40  →  Create Violation (SPEEDING)
```

### Example — sign-based (implemented demo mode)

```text
Detected Sign:  No Left Turn (R1-01)
Observed Action: TURN_LEFT   (demo preset or future CV tracking)

Rule match  →  Create Violation (ILLEGAL_LEFT_TURN)
```

**Status:** ✅ Rule engine + evidence + confidence · ⚠️ Speed/spatial ROI pending  
**API:** `POST /api/violations/evaluate/`, `POST /api/violations/`  
**Tables:** `traffic_violations`, `violation_rules`, `traffic_signs`  
**Evidence saved:** frame image, vehicle crop, plate crop, `bbox_coords`, `ai_confidence_score`

---

# Phase 6: Unknown Vehicle Flow

When AI detects a plate not in the database, the system must **not auto-fine** — it routes to officer review.

```text
AI Detect Plate
      ↓
Search Vehicle Database
      ↓
    Found? ──Yes──► Link to driver → continue violation flow
      │
      No
      ↓
Unknown Vehicle Queue
      ↓
Officer Review
      ↓
Link Vehicle  or  Reject Detection
```

**Operational rule (from PLAN.md):** Reads with `ai_confidence_score < 75%` should also route to unknown queue rather than auto-citing.

**Status:** ❌ `unknown_vehicles` table and queue UI not built  
**Planned API:** `PATCH /api/v1/admin/unknown-vehicles/{id}/resolve/`  
**Current:** Plate search via `GET /api/vehicles/search/?plate=` (manual officer lookup)

---

# Phase 7: Officer Review Flow

Real-world systems never fully trust AI. Every violation requires human verification before a fine is issued.

```text
Violation Created
      ↓
Pending Review
      ↓
Officer Checks Evidence
      ↓
    Approve  or  Reject
```

### Approve

```text
Generate Fine
(status → confirmed)
```

### Reject

```text
Mark Invalid
(status → rejected)
```

**Status:** ✅ Violations list · confirm/reject workflow · evidence viewer  
**UI:** `ViolationsPage.tsx` — filter by status, view evidence images  
**Table:** `traffic_violations.status` — `draft` → `pending_review` → `confirmed` / `rejected`  
**PRD policy:** Mandatory human-in-the-loop for first 6 months of pilot

---

# Phase 8: Fine Generation Flow

```text
Officer Approves Violation
      ↓
System Calculates Fine
      ↓
Create Fine Record
      ↓
Set Due Date
      ↓
Notify Citizen
```

### Example

```text
Violation:  Speeding
      ↓
Fine:       $25 (or KHR equivalent from violation_rules.default_fine_amount)
      ↓
Due:        15 days from issue date
```

**Status:** ✅ Issue fine from violation · PDF export · due date · status workflow  
**API:** `POST /api/fines/`, `GET /api/fines/{id}/pdf/`  
**Table:** `fines` — linked 1:1 to `traffic_violations`  
**Fine statuses:** `pending` · `paid` · `overdue` · `dismissed` · `disputed` (planned)

---

# Phase 9: Notification Flow

```text
Fine Generated
      ↓
Create Notification
      ↓
Email          ← planned
      ↓
SMS            ← planned
      ↓
Dashboard Alert
```

### Citizen sees

```text
You have received a traffic violation.

Fine Amount:  $25
Due Date:     15 June 2026
```

**Status:** ⚠️ In-app notifications on detection, violation, fine · ❌ Email/SMS  
**API:** `GET /api/notifications/`, mark read endpoints  
**Table:** `notifications`  
**Triggers:** Fine issued · violation confirmed · detection saved (configurable via `user_preferences`)

---

# Phase 10: Payment Flow

```text
Citizen Login
      ↓
View Fine
      ↓
Choose Payment Method
      ↓
Upload Receipt
      ↓
Officer Verify
      ↓
Mark Paid
```

### Fine statuses through payment lifecycle

```text
Pending  →  Paid
         →  Overdue  (past due_date)
         →  Disputed  (appeal submitted — locks escalation)
```

**Status:** ❌ Receipt upload + officer verify not built · ✅ View fines + PDF + status PATCH  
**Planned API:** `POST /api/v1/fines/{id}/pay/`, `PATCH /api/v1/fines/{id}/verify-payment/`  
**Planned fields:** `payment_method`, `payment_reference`, `payment_screenshot`

---

# Phase 11: Appeal Flow

```text
Citizen Disagrees With Fine
      ↓
Submit Appeal
      ↓
Upload Supporting Evidence
      ↓
Officer Review
      ↓
Approve Appeal  or  Reject Appeal
```

### Approve appeal

```text
Fine Cancelled (status → dismissed)
Violation marked disputed
```

### Reject appeal

```text
Fine Remains Active (status → pending or overdue)
```

**Status:** ❌ Full appeals workflow not built  
**Planned API:** `POST /api/v1/appeals/submit/`, `POST /api/v1/appeals/{id}/review/`  
**Planned table:** `violation_appeals` — locks fine while `status = pending`

---

# Phase 12: Dashboard Flow

### Admin Dashboard

```text
Total Users
Total Vehicles
Total Violations
Total Fines
AI Accuracy
Camera Status        ← planned telemetry
Pending Appeals      ← planned
Unknown Vehicle Queue ← planned
```

**Status:** ✅ Core metrics + charts + PDF/Excel export  
**API:** `GET /api/dashboard/admin/`  
**Portal:** `frontend-admin` (:5174)

---

### Officer Dashboard

```text
Pending Reviews
Unknown Vehicles     ← planned
Pending Appeals      ← planned
Today's Violations
Evidence Archive
Live AI Detection
```

**Status:** ✅ Police stats · violation list · AI detection page  
**API:** `GET /api/dashboard/police/`, `/api/dashboard/evidence/`  
**Portal:** `frontend-user` — Officer tab (:5173)

---

### Citizen Dashboard

```text
My Vehicles
My Violations
My Fines
My Appeals           ← planned
Notifications
```

**Status:** ✅ Vehicles · fines · notifications · ⚠️ violations view · ❌ appeals  
**API:** `GET /api/dashboard/driver/`  
**Portal:** `frontend-user` — Driver tab (:5173)

---

# Recommended Development Order

Build in sprints following the **enforcement lifecycle**, not random CRUD modules.

### Sprint 1 — Identity & Registry ✅

| Item | Status |
| --- | --- |
| Authentication | ✅ |
| User Management | ✅ |
| Vehicle Management | ✅ |
| KYC Verification | ❌ |

---

### Sprint 2 — Infrastructure ✅

| Item | Status |
| --- | --- |
| Camera Management | ⚠️ CRUD done; streaming/heartbeat pending |
| Roads Management | ✅ |
| Dashboard Layout | ✅ |

---

### Sprint 3 — AI Core ✅

| Item | Status |
| --- | --- |
| AI Training (10-class YOLO) | ✅ |
| Traffic Sign Detection | ✅ |
| Plate Detection + OCR | ⚠️ Latin plates |
| Vehicle Detection + ByteTrack | ✅ |

---

### Sprint 4 — Enforcement ⚠️

| Item | Status |
| --- | --- |
| Violation Engine | ✅ |
| Officer Review | ✅ |
| Fine Generation | ✅ |
| Notifications | ⚠️ In-app only |

---

### Sprint 5 — Completion ❌

| Item | Status |
| --- | --- |
| Unknown Vehicle Queue | ❌ |
| Payment Flow | ❌ |
| Appeals | ❌ |
| Reports | ⚠️ PDF/Excel done; daily/weekly pending |
| Deployment (Docker, Redis, HTTPS) | ❌ |

Track detailed checkboxes in [TASKS.md](TASKS.md).

---

# Defense Demo Flow (Thesis Priority)

Practice this end-to-end before defense — demonstrates the full enforcement story:

```text
Upload Image OR Live Webcam (confirmed scan)
        ↓
Traffic Sign Detected (YOLO 10-class + Khmer/EN labels)
        ↓
Vehicle Detected (+ ByteTrack ID on live feed)
        ↓
OCR Read Plate (e.g. 2A-1234 + province)
        ↓
Violation Generated (rule engine + observed_action preset)
        ↓
Evidence Saved (frame + vehicle + plate crops)
        ↓
Violation Record → Pending Review
        ↓
Officer Approves
        ↓
Fine Generated + Notification
        ↓
Dashboard Statistics + PDF Report
```

**Demo tips:**

- Use **upload** with `sign_only: false` for full pipeline in one API call
- Use **live webcam** for real-time overlays and ByteTrack IDs
- Run `python manage.py test tests.test_e2e_pipeline` before defense
- Follow [DEMO_SCRIPT.md](DEMO_SCRIPT.md)

---

# Data Flow (Database)

```text
Camera / Webcam / Upload
        ↓
YOLO sign detect → class_key
        ↓
traffic_signs lookup
        ↓
ai_detection_logs INSERT
        ↓
OCR plate_detected → vehicles.license_plate
        ↓
    Found? ──No──► unknown_vehicles queue (planned)
        │
       Yes
        ↓
violation_rules + observed_action → traffic_violations
        ↓
Officer approve → fines INSERT
        ↓
notifications INSERT
        ↓
Citizen pay or appeal (planned)
        ↓
Case closed (paid / dismissed)
```

---

# Flow Status Summary

| Phase | Flow | Status |
| --- | --- | --- |
| 1 | Citizen Registration | ⚠️ 70% |
| 2 | Vehicle Registration | ⚠️ 60% |
| 3 | Camera Management | ⚠️ 55% |
| 4 | AI Detection | ✅ 85% |
| 5 | Violation Processing | ⚠️ 70% |
| 6 | Unknown Vehicle | ❌ 0% |
| 7 | Officer Review | ✅ 90% |
| 8 | Fine Generation | ✅ 80% |
| 9 | Notification | ⚠️ 30% |
| 10 | Payment | ❌ 0% |
| 11 | Appeal | ❌ 0% |
| 12 | Dashboard | ⚠️ 75% |

---

## Related Documents

| Document | Purpose |
| --- | --- |
| [PRD.md](PRD.md) | Product requirements |
| [PLAN.md](PLAN.md) | 12-month rollout + QA strategy |
| [TASKS.md](TASKS.md) | Phase 1–16 development checklist |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Tables per flow phase |
| [API_SPEC.md](API_SPEC.md) | REST endpoints per flow |
| [TECH_STACK.md](TECH_STACK.md) | Technology stack |
| [DEMO_SCRIPT.md](DEMO_SCRIPT.md) | Defense demonstration script |
| [docs/hybrid_detection_flow.md](docs/hybrid_detection_flow.md) | YOLO + Gemini hybrid detail |
