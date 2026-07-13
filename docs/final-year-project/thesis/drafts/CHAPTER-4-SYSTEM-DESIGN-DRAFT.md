# Chapter 4 — System Design [DRAFT]

**Task 385** · CamTraffic Final Year Project · 2026

---

## 4.1 Architecture Overview

CamTraffic uses a **modular monolith**: Django REST API hosts business logic and embedded AI inference; two React SPAs serve admin and user roles; PostgreSQL stores data; Redis and Celery handle async tasks in production.

```
Client (React) → Nginx → Gunicorn/Django → PostgreSQL
                              ↓
                         YOLO + OCR pipeline
                              ↓
                         Redis / Celery
```

See `docs/ARCHITECTURE.md` for full logical diagram.

---

## 4.2 Use Case Diagram

Actors: System Admin, Traffic Police, Driver, AI Engine.

Primary use cases: manage users, manage signs/cameras, run AI detection, review violations, issue/pay fines, submit/review appeals, view reports, manage vehicles, receive notifications.

**Figure reference:** `docs/final-year-project/diagrams/USE-CASE-DIAGRAM.md`

---

## 4.3 Class Diagram

Core domain classes: User, Officer, Driver, Vehicle, TrafficSign, ViolationRule, TrafficViolation, Fine, Appeal, Camera, AIDetectionLog.

Relationships: User owns Vehicles; Violation may generate Fine; Fine may have Appeals; ViolationRule defines sign-to-violation mapping.

**Figure reference:** `docs/final-year-project/diagrams/CLASS-DIAGRAM.md`

---

## 4.4 Sequence Diagrams

**Violation flow:** Officer uploads image → POST `/api/ai/detect/` → YOLO + OCR → rule evaluation → optional Violation + Fine + Notification.

**Login flow:** Client POST `/api/auth/login/` → JWT access + refresh → route by role.

**Figure reference:** `docs/final-year-project/diagrams/SEQUENCE-DIAGRAM-VIOLATION-FLOW.md`

---

## 4.5 Entity-Relationship Design

16 Django apps; UUID primary keys on core entities. Key tables: users, violations, fines, appeals, ai_detection_logs, cameras, roads, traffic_signs.

**Figure reference:** `docs/DATABASE.md`

---

## 4.6 Deployment Design

Production: 8-service Docker Compose (nginx, backend, ai-worker, celery-worker, celery-beat, postgres, redis, certbot).

**Figure reference:** `docs/final-year-project/diagrams/DEPLOYMENT-DIAGRAM.md`

---

## 4.7 Security Design

| Control | Implementation |
|---------|----------------|
| Authentication | JWT access + refresh, OAuth optional |
| Authorization | Role field + RBAC permissions |
| Audit | audit_logs app |
| Transport | TLS 1.2/1.3 via Let's Encrypt |
| Upload safety | MIME validation, size limits |

---

*Draft version — see `CHAPTER-4-SYSTEM-DESIGN-FINAL.md` for submission copy.*
