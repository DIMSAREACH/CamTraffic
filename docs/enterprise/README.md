# CamTraffic Enterprise Specification

**System:** AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia  
**Version:** 2.0 Enterprise · **Date:** July 2026  
**Audience:** Solution architects, engineering leads, DevOps, security, product, and implementation teams  
**Status:** Production-ready target architecture (nationwide deployment)

---

## Purpose

This package defines the **enterprise-grade, production-ready** specification for nationwide deployment of CamTraffic across Cambodia. It extends the current thesis implementation (`docs/PRD.md`, `docs/ARCHITECTURE.md`) into a multi-region, microservice-based platform supporting 20 core capability domains.

---

## Document Index

| # | Document | Contents |
|---|----------|----------|
| 1 | [01-REQUIREMENTS.md](./01-REQUIREMENTS.md) | Functional requirements, non-functional requirements, use cases, user stories |
| 2 | [02-RBAC-AND-SECURITY.md](./02-RBAC-AND-SECURITY.md) | RBAC matrix, security architecture, compliance |
| 3 | [03-SYSTEM-ARCHITECTURE.md](./03-SYSTEM-ARCHITECTURE.md) | Logical architecture, microservices, frontend/backend/AI/OCR/video pipelines |
| 4 | [04-DATABASE-DESIGN.md](./04-DATABASE-DESIGN.md) | Schema design, ERD, partitioning, replication |
| 5 | [05-API-SPECIFICATION.md](./05-API-SPECIFICATION.md) | REST API catalog, events, integrations |
| 6 | [openapi.yaml](./openapi.yaml) | OpenAPI 3.1 machine-readable specification |
| 7 | [06-INFRASTRUCTURE-AND-DEVOPS.md](./06-INFRASTRUCTURE-AND-DEVOPS.md) | Kubernetes, Terraform, CI/CD, monitoring, logging, DR |
| 8 | [07-DIAGRAMS.md](./07-DIAGRAMS.md) | Use case, sequence, class, data flow, deployment diagrams |

---

## Capability Map (20 Domains)

| # | Domain | Primary Services |
|---|--------|------------------|
| 1 | AI Traffic Sign Detection | `ai-vision-service`, `sign-catalog-service` |
| 2 | Vehicle Detection & Tracking | `ai-vision-service`, `tracking-service` |
| 3 | License Plate Recognition (ANPR/OCR) | `ocr-service`, `ai-vision-service` |
| 4 | Helmet Detection | `ai-vision-service` (behavior model) |
| 5 | Seatbelt Detection | `ai-vision-service` (behavior model) |
| 6 | Mobile Phone Usage Detection | `ai-vision-service` (behavior model) |
| 7 | Wrong Lane Detection | `ai-vision-service`, `gis-service` |
| 8 | Speed Violation Detection | `ai-vision-service`, `radar-ingest-service` |
| 9 | Red Light Violation Detection | `ai-vision-service`, `signal-sync-service` |
| 10 | Automatic Traffic Law Enforcement | `enforcement-service`, `rules-engine` |
| 11 | Fine Calculation Engine | `fine-service`, `rules-engine` |
| 12 | Violation Appeal Management | `appeal-service` |
| 13 | Citizen Mobile Application | `frontend-citizen` (Next.js PWA / React Native bridge) |
| 14 | Government Administration Portal | `frontend-admin` (Next.js) |
| 15 | Real-time Monitoring Dashboard | `frontend-ops`, `analytics-service` |
| 16 | GIS Mapping System | `gis-service`, PostGIS |
| 17 | Camera Management System | `camera-service`, `stream-gateway` |
| 18 | Notification System | `notification-service` |
| 19 | Online Payment Gateway | `payment-service` (KHQR, ABA, Wing) |
| 20 | Analytics & Reporting | `analytics-service`, `report-service` |

---

## Technology Stack (Target Production)

| Layer | Technology |
|-------|------------|
| **Citizen / Admin / Ops UI** | Next.js 15, React 19, TypeScript, TailwindCSS, Shadcn UI |
| **Core API** | Django REST Framework 5.x (domain services, auth, enforcement) |
| **AI / Stream API** | FastAPI (vision inference, WebRTC/RTSP ingest, gRPC internal) |
| **Database** | PostgreSQL 16 + PostGIS, read replicas, PgBouncer |
| **Cache / Queue** | Redis 7 (Cluster), Celery, Redis Streams |
| **Message Bus** | Apache Kafka (violation events, audit, analytics) |
| **Object Storage** | S3-compatible (MinIO on-prem / AWS S3) |
| **AI Runtime** | YOLOv11, OpenCV, PyTorch, EasyOCR, TensorRT (optional) |
| **Infrastructure** | Docker, Kubernetes (EKS/AKS/on-prem), Nginx Ingress, Terraform |
| **CI/CD** | GitHub Actions, Argo CD (GitOps) |
| **Observability** | Prometheus, Grafana, Loki, Tempo, Alertmanager |

---

## Migration Path from Current Codebase

| Current (v1) | Enterprise (v2) |
|--------------|-----------------|
| Vite + React SPAs | Next.js App Router (3 apps: admin, ops, citizen) |
| Django monolith with embedded AI | Django core + FastAPI AI microservices |
| Single PostgreSQL | Primary + read replicas + PostGIS |
| Docker Compose | Kubernetes multi-namespace per province |
| Manual fine payment | KHQR / bank gateway integration |
| Web-only citizen access | PWA + optional React Native shell |

Existing Django apps (`violations`, `fines`, `appeals`, `ai_detection`, etc.) map directly to bounded contexts in the microservice decomposition documented in [03-SYSTEM-ARCHITECTURE.md](./03-SYSTEM-ARCHITECTURE.md).

---

## Related Legacy Documents

- `docs/PRD.md` — Product requirements (v1 scope)
- `docs/SRS.md` — Software requirements (implemented features)
- `docs/ARCHITECTURE.md` — Current modular monolith
- `docs/DATABASE.md` — Current schema
- `backend/docs/API.md` — Current REST catalog
