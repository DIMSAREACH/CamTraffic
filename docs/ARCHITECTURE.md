# CamTraffic System Architecture

## Overview

CamTraffic is a monorepo-based enterprise system for AI-powered traffic sign detection and traffic law enforcement in Cambodia.

## High-Level Architecture

```text
┌─────────────────┐     ┌─────────────────┐
│ frontend-admin  │     │ frontend-user   │
│  (React/Vite)   │     │  (React/Vite)   │
│   Port 5173     │     │   Port 5174     │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │ REST API
              ┌──────▼──────┐
              │   backend   │
              │   (Django)  │
              │  Port 8000  │
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼────┐ ┌────▼────┐ ┌───▼────┐
    │PostgreSQL│ │  Redis  │ │ai-svc  │
    │   DB    │ │ (Celery)│ │Port8001│
    └─────────┘ └─────────┘ └────────┘
```

## Services

| Service | Technology | Port | Folder |
|---------|------------|------|--------|
| Super Admin Portal | React + Vite + TypeScript | 5173 | `frontend-admin/` |
| Officer & Driver Portal | React + Vite + TypeScript | 5174 | `frontend-user/` |
| REST API | Django + DRF | 8000 | `backend/` |
| AI Pipeline | FastAPI + YOLOv11 + OpenCV + EasyOCR | 8001 | `ai-service/` |
| Shared Libraries | TypeScript packages | — | `packages/` |

## Shared Packages

| Package | Purpose |
|---------|---------|
| `@camtraffic/ui` | Shared React components, theme, i18n |
| `@camtraffic/api` | Typed HTTP API client |
| `@camtraffic/hooks` | Reusable React hooks |
| `@camtraffic/types` | Domain and API TypeScript types |
| `@camtraffic/utils` | Formatting and validation helpers |

## Backend Apps (Django)

| App | Domain |
|-----|--------|
| `accounts` | JWT authentication, sessions |
| `rbac` | Roles and permissions |
| `users` | User profiles and avatars |
| `officers` | Traffic officers, police stations |
| `drivers` | Driver records |
| `vehicles` | Vehicle registration |
| `cameras` | Camera devices and streams |
| `traffic_signs` | Sign catalog and categories |
| `ai_models` | Model versions and training |
| `detections` | AI detection results |
| `ocr` | OCR results |
| `violations` | Traffic violations |
| `fines` | Fines and payments |
| `appeals` | Violation appeals |
| `reports` | Report generation |
| `notifications` | Notifications and templates |
| `dashboard` | Aggregated statistics |
| `audit` | Audit and login logs |
| `system` | Settings, backup |

## AI Service Modules

| Module | Responsibility |
|--------|----------------|
| `detection` | YOLOv11 sign detection |
| `processing` | OpenCV image processing |
| `ocr` | EasyOCR text recognition |
| `pipeline` | End-to-end orchestration |
| `storage` | Result persistence |
| `metrics` | Performance tracking |
| `api` | Detection history endpoints |
| `health` | Service health monitoring |

## Data Flow — Violation Detection

```text
Camera Stream → ai-service (detect) → backend (store)
                                    → officer review (frontend-user)
                                    → driver notification (frontend-user)
```

## Deployment Stack (Phase 9)

- **Docker** — containerized services
- **Nginx** — reverse proxy, SSL termination
- **Gunicorn** — Django WSGI server
- **Celery + Redis** — background tasks
- **GitHub Actions** — CI/CD pipeline
