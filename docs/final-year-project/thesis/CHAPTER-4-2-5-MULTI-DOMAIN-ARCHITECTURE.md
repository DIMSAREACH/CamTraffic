# Chapter 4.2.5 — Enterprise Multi-Domain System Architecture

**CamTraffic — AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia**

Norton University Final Year Project

---

## 4.2.5 Enterprise Multi-Domain System Architecture

The system is designed using a **multi-domain architecture** to separate administration, traffic operations, and citizen services. This matches real-world government traffic enforcement systems and avoids putting all functions inside a single “Admin Dashboard”.

### Domain overview

| Domain | Actor | Portal / routes | API namespace | Responsibility |
|--------|-------|-----------------|---------------|----------------|
| **Administration** | Admin | `frontend-admin` → `/admin/*` | `/api/v1/admin/` | System governance, RBAC, cameras, AI models, reports, audit, settings |
| **Traffic Operations** | Officer (`police`) | `frontend-user` → `/officer/*` | `/api/v1/officer/` | Live monitoring, AI review, evidence, approve/reject, issue fines |
| **Citizen Service** | Driver / Citizen | `frontend-user` → `/citizen/*` | `/api/v1/citizen/` | Own vehicles, violations, evidence view, payments, appeals, notifications |

Legacy `/dashboard/*` URLs redirect to `/officer/*` or `/citizen/*` based on role.

---

### Architecture diagram

```
                PUBLIC / AUTH
                       │
                       ▼
                React Frontend
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
 Administration   Traffic Ops    Citizen Service
   /admin/*         /officer/*      /citizen/*
        │              │              │
        └──────────────┼──────────────┘
                       ▼
              Django REST API (/api/v1/)
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   /admin/*       /officer/*      /citizen/*
   (RBAC,         (queue,          (self-service
    audit,         approve,         vehicles,
    models)        issue fine)      appeals)
                       │
                       ▼
                 AI FastAPI / Django AI
                       │
              YOLO + OpenCV + EasyOCR
                       │
                       ▼
                  PostgreSQL DB
```

---

### Administration Domain

Responsible for system governance, user management, RBAC, camera configuration, AI model management, reporting, audit logging, and system settings.

**Admin does not** approve AI detections or issue fines (law-enforcement actions belong to Traffic Operations).

Admin sidebar (representative): Dashboard · Users · Roles & Permissions · Cameras · Roads · Traffic Signs · AI Models · Reports · Audit Logs · Settings.

---

### Traffic Operations Domain

Responsible for real-time camera monitoring, AI detection review, violation verification, evidence management, fine issuance, and field operations performed by traffic police officers.

**Critical workflow**

1. Camera detects → YOLO + OCR identify vehicle and plate  
2. AI creates case → evidence package + confidence score  
3. Officer reviews → human verification is mandatory  
4. Approve / Reject → decision recorded with audit trail  
5. Driver notified → fine and evidence available in Citizen portal  

Officer routes: `/officer`, `/officer/ai-detection`, `/officer/cameras`, `/officer/violations`, `/officer/fines`, `/officer/evidence`, …

Officer APIs (examples):

- `GET /api/v1/officer/detection-queue/`
- `POST /api/v1/officer/violations/{id}/approve/`
- `POST /api/v1/officer/violations/{id}/reject/`
- `POST /api/v1/officer/fines/issue/`

---

### Citizen Service Domain

Responsible for driver self-service functions including vehicle registration, viewing violations, accessing evidence, checking payment status, receiving notifications, and submitting appeals.

**Driver can:** view own violations, evidence, fines, payment status, appeal status; manage own vehicles.  
**Driver cannot:** edit violations, delete evidence, approve cases, or access other users’ data.

Citizen routes: `/citizen`, `/citizen/vehicles`, `/citizen/violations`, `/citizen/fines`, `/citizen/appeals`, …

Citizen APIs (examples):

- `GET /api/v1/citizen/dashboard/`
- `GET /api/v1/citizen/vehicles/`
- `GET /api/v1/citizen/violations/`
- `POST /api/v1/citizen/appeals/`

---

### Permission matrix

| Feature | Admin | Officer | Driver |
|---------|-------|---------|--------|
| Create user / manage roles | ✅ | ❌ | ❌ |
| View cameras / AI detection | ✅ (config) | ✅ (ops) | ❌ |
| Approve AI detection | ❌ | ✅ | ❌ |
| Issue fine | ❌ | ✅ | ❌ |
| View own violations | ❌ | ❌ | ✅ |
| Submit appeal | ❌ | ❌ | ✅ |
| View audit logs | ✅ | Limited | ❌ |

---

### Database grouping (logical)

**Identity & security:** `users`, RBAC tables, `audit_logs`  
**Traffic operations:** `cameras`, `roads`, `traffic_signals`, `vehicles`, `traffic_violations`, detection/evidence logs  
**Citizen services:** `fines`, payment fields, `violation_appeals`, `notifications`  
**AI management:** `ai_model_versions` (and related MLOps tables)

---

### Implementation notes (CamTraffic codebase)

| Layer | Location |
|-------|----------|
| Admin SPA | `frontend-admin/` |
| Officer + Citizen SPA | `frontend-user/` (`/officer`, `/citizen`) |
| Domain API facades | `backend/domains/` |
| Shared domain resources | `backend/violations`, `fines`, `vehicles`, … |
| AI service | `ai_service/` + `backend/ai_detection/` |

Role field in the database remains `admin` | `police` | `driver`. UI and thesis text use **Admin / Officer / Citizen (Driver)**.

This separation improves **security**, **scalability**, **maintainability**, and **compliance** with real-world government traffic enforcement workflows.
