# Chapter 4 - System Design

## 4.1 Design Objectives

The system design aimed to satisfy four core constraints:
- role-based workflows for admin, officer, and driver users
- AI-assisted detection pipeline with asynchronous processing
- operational reliability through health checks and monitoring
- extensibility for future model upgrades and new client applications

## 4.2 High-Level Architecture

CamTraffic uses a service-oriented architecture with two main runtime services:
- Django backend for business logic, persistence, RBAC, and notifications
- FastAPI AI service for image pipeline execution (detection + OCR)

Supporting infrastructure:
- PostgreSQL for relational data
- Redis + Celery for asynchronous tasks
- Nginx for reverse proxy and static frontend hosting

Reference diagrams:
- `docs/ARCHITECTURE-DIAGRAMS.md`
- `docs/final-year-project/diagrams/DEPLOYMENT-DIAGRAM.md`

## 4.3 Actor and Use Case Design

Primary actors:
- Admin
- Officer
- Driver
- Camera (external event source)

Key use cases:
- manage users/cameras
- submit or ingest frames for AI processing
- review and decide violations
- notify officers and drivers
- fine payment and appeal workflows

Diagram artifact:
- `docs/final-year-project/diagrams/USE-CASE-DIAGRAM.md`

## 4.4 Domain Model Design

Core domain entities:
- `User`, `Officer`, `Driver`
- `PoliceStation`, `Camera`
- `Detection`, `OCRResult`
- `Vehicle`, `Violation`, `Fine`, `Appeal`
- `Notification`

Design rationale:
- clean separation between event data (`Detection`, `OCRResult`) and legal workflow data (`Violation`, `Fine`, `Appeal`)
- station-level partitioning for officer access and notifications
- explicit audit-ready transitions via status fields

Class diagram artifact:
- `docs/final-year-project/diagrams/CLASS-DIAGRAM.md`

## 4.5 Sequence and Interaction Design

Critical runtime sequence:
1. camera frame submitted to backend integration endpoint
2. backend enqueues Celery task
3. Celery calls AI service `/pipeline/run`
4. detection and OCR persisted
5. violation and notifications created when applicable

Sequence artifact:
- `docs/final-year-project/diagrams/SEQUENCE-DIAGRAM-VIOLATION-FLOW.md`

## 4.6 API and Integration Design

Design principles:
- RESTful endpoints under `/api/v1/`
- JWT authentication
- standardized success/error response envelopes
- SSE for live detection feed

Integration endpoint examples:
- `POST /api/v1/integration/cameras/{id}/process-frame/`
- `GET /api/v1/integration/detections/live-feed/`

API reference:
- `backend/docs/API.md`

## 4.7 Security and Access Design

RBAC roles:
- `super_admin`
- `admin`
- `officer`
- `driver`

Security controls:
- JWT-based authentication and refresh lifecycle
- role-gated endpoint permissions
- upload content-type validation
- ORM-based query safety and security test coverage

## 4.8 Deployment Topology Design

Production topology includes:
- Ubuntu VPS host
- Dockerized backend, ai-service, celery, postgres, redis, nginx
- SSL certificates via Certbot
- backup automation via `pg_dump`

Deployment artifact:
- `docs/final-year-project/diagrams/DEPLOYMENT-DIAGRAM.md`

## 4.9 Design Decisions and Tradeoffs

1. Microservice split (backend + AI service)
- Pros: independent scaling/deployment boundaries
- Cons: extra network hop and observability complexity

2. Async frame processing with Celery
- Pros: responsive API and resilient job handling
- Cons: queue consistency and retry management required

3. EasyOCR baseline + post-processing
- Pros: fast integration and measurable early gains
- Cons: Khmer plate handling remains constrained

4. Monorepo architecture
- Pros: shared types and consistent tooling
- Cons: larger repository and CI surface area

## 4.10 Summary

The design balances academic scope and production realism by combining robust domain modeling, event-driven pipeline integration, and operational deployment practices. The resulting architecture supports end-to-end enforcement workflows while remaining extensible for future GPU-trained model upgrades and broader camera integration.
