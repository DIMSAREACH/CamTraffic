# Chapter 4 — System Design

**CamTraffic Final Year Project**

---

## 4.1 Design Goals

| Goal | Design decision |
|------|-----------------|
| Maintainability | Modular Django apps with clear URL namespaces |
| Security | JWT + RBAC + audit logging |
| Performance | Embedded inference; optional ai-worker container |
| Deployability | Docker Compose production stack |
| Usability | Three-domain portals (Admin / Officer / Citizen); Khmer/English i18n |
| Auditability | AIDetectionLog, AuditLog, evidence archive |

---

## 4.2 Logical Architecture

CamTraffic implements a **modular monolith** (not microservices): Django hosts REST APIs and loads YOLO weights in-process (or via dedicated ai-worker in production).

```
┌──────────────────────────────────────────────────────────────────┐
│  Presentation (multi-domain)                                      │
│  Admin :5174 /admin/*  ·  Officer /officer/*  ·  Citizen /citizen/*│
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTPS / JSON /api/v1/*
┌───────────────────────────▼──────────────────────────────────────┐
│  Application: Django REST + Gunicorn                              │
│  /admin · /officer · /citizen namespaces + domain apps            │
│  authentication · rbac · violations · fines · ai_detection · audit│
└───────────────┬─────────────────────────┬────────────────────────┘
                │                         │
┌───────────────▼──────────┐   ┌──────────▼──────────┐
│  AI Pipeline              │   │  Celery + Redis      │
│  YOLO11n + EasyOCR        │   │  async tasks         │
└───────────────┬──────────┘   └─────────────────────┘
                │
┌───────────────▼──────────┐
│  PostgreSQL 16            │
└──────────────────────────┘
```

Full narrative: `docs/ARCHITECTURE.md`

### 4.2.5 Enterprise Multi-Domain System Architecture

See **`docs/final-year-project/thesis/CHAPTER-4-2-5-MULTI-DOMAIN-ARCHITECTURE.md`** for the full Administration / Traffic Operations / Citizen Service separation (portals, APIs, permission matrix, and diagrams).

Summary: CamTraffic does **not** place all features in one Admin Dashboard. It separates:

1. **Administration** (`/admin/*`, `/api/v1/admin/`) — governance, RBAC, cameras, AI models, audit  
2. **Traffic Operations** (`/officer/*`, `/api/v1/officer/`) — live monitor, AI review, approve/reject, issue fines  
3. **Citizen Service** (`/citizen/*`, `/api/v1/citizen/`) — own vehicles, violations, payments, appeals  

---

## 4.3 Use Case Model

**Figure 4.1** — Use case diagram (see `docs/final-year-project/diagrams/USE-CASE-DIAGRAM.md`)

| Actor | Primary use cases |
|-------|-------------------|
| System Admin | UC-01 Manage users & roles, UC-02 Manage signs/cameras, UC-07 Reports & audit |
| Traffic Police | UC-03 Run AI detection, UC-04 Review violations, UC-05 Issue fines, UC-06 Appeals |
| Driver | UC-05 Pay fines, UC-06 Submit appeals, UC-08 Manage vehicles, UC-09 Notifications |
| AI Engine | Supports UC-03 (external automated actor) |

---

## 4.4 Domain Class Model

**Figure 4.2** — Class diagram (`docs/final-year-project/diagrams/CLASS-DIAGRAM.md`)

Key aggregates:

- **Identity:** User → Officer | Driver profiles  
- **Enforcement:** ViolationRule → TrafficViolation → Fine → Appeal  
- **Infrastructure:** Road → Camera  
- **AI:** AIDetectionLog references TrafficSign metadata  

All core entities inherit UUID primary keys via `UUIDPrimaryKeyModel`.

---

## 4.5 Interaction Design

**Figure 4.3** — Violation detection sequence (`docs/final-year-project/diagrams/SEQUENCE-DIAGRAM-VIOLATION-FLOW.md`)

Primary flow:

1. Officer POST `/api/ai/detect/` with image  
2. Pipeline returns sign detections + optional plate text  
3. Rule engine evaluates prohibited action  
4. System persists log; optionally creates Violation and Fine  
5. Notification dispatched to driver user account  

Alternate flows: webcam via `/api/ai/process-frame/`; manual violation confirmation before fine issuance.

---

## 4.6 Data Model

**Figure 4.4** — Entity-relationship diagram (`docs/DATABASE.md`)

Sixteen Django apps map to normalized tables with foreign-key integrity in PostgreSQL. Indexes on `users.email`, `fines.status`, and `vehicles.plate_number` support lookup performance.

Violation rules store `sign_class_key` matching YOLO output labels—bridging ML and relational data.

---

## 4.7 Deployment Architecture

**Figure 4.5** — Deployment diagram (`docs/final-year-project/diagrams/DEPLOYMENT-DIAGRAM.md`)

Production topology:

| Service | Role |
|---------|------|
| nginx | TLS termination, static SPA, reverse proxy |
| backend | Gunicorn WSGI (4 workers) |
| ai-worker | Optional isolated inference |
| celery-worker / beat | Background jobs |
| postgres | Persistent data |
| redis | Broker + cache |
| certbot | SSL renewal |

---

## 4.8 Security Architecture

| Layer | Control |
|-------|---------|
| Transport | TLS 1.2/1.3, HSTS |
| Authentication | JWT access (short TTL) + refresh rotation |
| Authorization | Role field + RBAC permission checks |
| Input validation | DRF serializers, MIME checks on uploads |
| Audit | Admin mutations logged to audit_logs |
| Secrets | Environment variables, not committed to git |

Threat mitigations tested: SQL injection (ORM-only), unauthorized API access (RBAC tests), malicious file upload (non-image rejection).

---

## 4.9 API Design

RESTful JSON under `/api/` with `/api/v1/` alias. Standard envelope: `{ success, message, data }`. Approximately 120 route handlers documented in `backend/docs/API.md`.

---

## 4.10 Summary

System design combines a modular monolith architecture, UML models, normalized data schema, and containerized deployment. Chapter 5 describes implementation details.

---

**Word count (approx.):** 680 · **Status:** Final submission version
