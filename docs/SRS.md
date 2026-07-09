# Software Requirements Specification (SRS)

**System**: CamTraffic — AI-Based Traffic Sign Detection and Traffic Law Enforcement System
**Version**: 1.0
**Date**: 2026-07
**Status**: Final Draft

---

## 1. Introduction

### 1.1 Purpose

This document specifies the software requirements for CamTraffic, defining the system's behavior, interfaces, and quality attributes for developers, testers, and stakeholders.

### 1.2 Scope

CamTraffic consists of:
- Two React/Vite/TypeScript web frontends (Admin Portal, Officer & Driver Portal)
- One Django REST API backend
- One FastAPI AI service (YOLOv11 + EasyOCR)
- PostgreSQL database, Redis message broker, Celery workers
- Docker Compose deployment stack

### 1.3 Definitions

| Term | Definition |
|------|-----------|
| YOLO | You Only Look Once — real-time object detection neural network |
| OCR | Optical Character Recognition |
| RBAC | Role-Based Access Control |
| SSE | Server-Sent Events |
| mAP | Mean Average Precision (object detection quality metric) |
| CER | Character Error Rate (OCR quality metric) |
| KHR | Khmer Riel (Cambodian currency) |

---

## 2. System Overview

```
[Camera]──frame──▶[AI Service :8001]──result──▶[Backend :8000]──REST──▶[Frontend :5173/:5174]
                                                       │
                                               [PostgreSQL][Redis]
                                                       │
                                               [Celery Workers]
```

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization

| ID | Requirement |
|----|-------------|
| SR-AUTH-01 | System shall authenticate users via JWT (access + refresh token pair). |
| SR-AUTH-02 | Access tokens shall expire in 60 minutes; refresh tokens in 7 days. |
| SR-AUTH-03 | RBAC shall enforce four roles: `super_admin`, `admin`, `officer`, `driver`. |
| SR-AUTH-04 | System shall support email verification and password reset via email link. |
| SR-AUTH-05 | All authentication events shall be recorded in `LoginHistory`. |

### 3.2 AI Detection Service

| ID | Requirement |
|----|-------------|
| SR-AI-01 | `POST /pipeline/run` shall accept a JPEG/PNG image and return detections + plate text. |
| SR-AI-02 | System shall load YOLOv11 weights from `AI_YOLO_WEIGHTS` env (default: `yolov11_camtraffic_v1.pt`). |
| SR-AI-03 | System shall fall back to mock mode when weights or ultralytics are unavailable. |
| SR-AI-04 | Pipeline shall complete in < 2 s on CPU (test baseline: ~62 ms inference, 640×640 input). |
| SR-AI-05 | OCR shall read plate text using EasyOCR with `en` language configuration. |
| SR-AI-06 | `GET /health` shall report readiness of each pipeline component. |

### 3.3 Camera → Backend Integration

| ID | Requirement |
|----|-------------|
| SR-INT-01 | `POST /api/v1/integration/cameras/{id}/process-frame/` shall accept image upload and dispatch a Celery task. |
| SR-INT-02 | Passing `?sync=1` shall execute the pipeline inline and return the result directly. |
| SR-INT-03 | On completion, system shall create a `Detection` record linked to the camera and active AI model version. |
| SR-INT-04 | If plate text is recognized, an `OCRResult` shall be created for the detection. |
| SR-INT-05 | If the plate matches a registered `Vehicle`, a `Violation` shall be auto-created with status `pending`. |

### 3.4 Notification System

| ID | Requirement |
|----|-------------|
| SR-NOT-01 | On new detection, one `Notification` per active station officer shall be created. |
| SR-NOT-02 | On violation creation, the vehicle owner shall receive a driver notification. |
| SR-NOT-03 | `GET /api/v1/integration/detections/live-feed/` SSE endpoint shall stream new detections every 3 s. |

### 3.5 Violation & Fine Workflow

| ID | Requirement |
|----|-------------|
| SR-VIO-01 | Officers shall review pending violations via `POST /api/v1/violations/officer/review/{id}/decision/`. |
| SR-VIO-02 | Approved violations shall trigger `Fine` creation with amount from `TrafficSign.fine_amount`. |
| SR-VIO-03 | Fine due date shall default to 30 days (configurable via `SystemSetting.fine_due_days`). |
| SR-VIO-04 | Drivers shall pay fines via `POST /api/v1/fines/driver/mine/{id}/pay/`. |
| SR-VIO-05 | Drivers may appeal approved violations via `POST /api/v1/appeals/driver/mine/`. |

### 3.6 Reporting

| ID | Requirement |
|----|-------------|
| SR-RPT-01 | Report exports shall support `csv` and `pdf` formats. |
| SR-RPT-02 | Reports shall be filterable by date range, camera, station, and violation type. |

---

## 4. Interface Requirements

### 4.1 Frontend (Admin Portal — port 5173)
- Stack: React 18, Vite, TypeScript, TailwindCSS, shadcn/ui, React Query, React Router v6.
- API client: `@camtraffic/api` package with JWT token injection.

### 4.2 Frontend (Officer & Driver Portal — port 5174)
- Same stack as admin portal; role-based route guards.

### 4.3 Backend REST API (port 8000)
- Framework: Django 5 + Django REST Framework.
- Auth: JWT via `djangorestframework-simplejwt`.
- Base URL: `http://localhost:8000/api/v1/`
- Full endpoint index: `backend/docs/API.md`.

### 4.4 AI Service REST API (port 8001)
- Framework: FastAPI.
- Full endpoint index: `ai-service/docs/MODULES.md`.

---

## 5. Database Requirements

- Engine: PostgreSQL 15+.
- 25+ tables across 18 Django apps.
- Full schema: `backend/docs/database/ER-DIAGRAM.md`.
- Migrations managed by Django (`python manage.py migrate`).

---

## 6. Non-Functional Requirements

| ID | Attribute | Specification |
|----|-----------|---------------|
| QA-01 | Test Coverage | ≥ 70% unit/integration test coverage (backend + AI service) |
| QA-02 | Lint | Zero flake8 / ruff / ESLint errors in CI |
| QA-03 | CI/CD | GitHub Actions pipeline on every push to `main` |
| QA-04 | Containerization | All services run in Docker containers via `docker compose up` |
| QA-05 | Secrets | All secrets via `.env` files; no secrets committed to git |
| QA-06 | Backup | Database backup via `system/backup` API and `backup_dataset.py` script |

---

## 7. Constraints and Assumptions

- Python ≥ 3.12; Node.js ≥ 20; Docker Engine ≥ 24.
- GPU (CUDA) recommended for production AI inference; CPU mode supported for development.
- EasyOCR `km` (Khmer) language model not available; Latin-alphabet plates processed with `en`.
- RTSP camera stream ingestion requires additional RTSP-reader integration in Phase 13.

---

## 8. Traceability Matrix (High-Level)

| PRD Requirement | SRS ID | Component |
|-----------------|--------|-----------|
| FR-AI-01 (detection) | SR-AI-01, SR-AI-02 | `ai-service/app/detection/` |
| FR-AI-02 (OCR) | SR-AI-05 | `ai-service/app/ocr/` |
| FR-AI-03 (plate match) | SR-INT-05 | `backend/apps/integration/violation_service.py` |
| FR-VIO-01 (auto-violation) | SR-INT-05 | `backend/apps/integration/violation_service.py` |
| FR-NOT-01 (officer notify) | SR-NOT-01 | `backend/apps/integration/notification_service.py` |
| FR-CAM-01 (camera CRUD) | SR-INT-01 | `backend/apps/cameras/` |
| FR-RPT-01 (reporting) | SR-RPT-01 | `backend/apps/reports/` |
