# Chapter 3 - Methodology

## 3.1 Research and Development Approach

This project followed an iterative SDLC methodology tailored for an AI-enabled software system. Instead of a single-pass waterfall process, the work progressed through repeated cycles of design, implementation, testing, and refinement to reduce risk in both software and model performance.

The workflow was executed in 4 layers:

1. Product and requirements layer: PRD/SRS definition, actor flows, acceptance criteria.
2. Software engineering layer: monorepo setup, API and UI implementation, CI/CD and deployment.
3. AI lifecycle layer: dataset curation, annotation, training, evaluation, optimization.
4. Validation layer: integration tests, performance/security tests, UAT, thesis reporting.

## 3.2 SDLC Phases Used in CamTraffic

### 3.2.1 Requirement Analysis

Primary documents:
- `docs/PRD.md`
- `docs/SRS.md`

Key requirement categories:
- Functional: camera management, detection monitoring, violation review, fine payment, appeals, reports.
- Non-functional: response time targets, role-based access control, reliability, auditability.
- AI-specific: YOLO detection quality, OCR quality, inference latency, end-to-end automation.

### 3.2.2 System Design

Design artifacts were produced before full implementation:
- Architecture and data flow: `docs/ARCHITECTURE.md`, `docs/ARCHITECTURE-DIAGRAMS.md`
- Database structure: `backend/docs/database/ER-DIAGRAM.md`
- Stage 11 diagrams: use case, class, sequence, deployment under `docs/final-year-project/diagrams/`

### 3.2.3 Implementation

Implementation was organized by modular phases in a monorepo:
- Frontend admin and user portals (React + Vite + TypeScript)
- Backend APIs (Django REST Framework)
- AI service (FastAPI + YOLOv11 + EasyOCR)
- Shared packages (`packages/ui`, `packages/api`, `packages/types`, `packages/hooks`, `packages/utils`)

### 3.2.4 Testing and Verification

Validation included 4 levels:
- Unit/functional testing
- Full integration and end-to-end flows
- Performance and security testing
- User Acceptance Testing (UAT)

### 3.2.5 Deployment and Operations

Production deployment used Docker Compose, Nginx reverse proxy, SSL automation, health checks, and backup scripts under `deploy/`.

## 3.3 Data Collection Methodology

## 3.3.1 Data Sources

The dataset combines reference data and project-specific curated assets:
- Traffic signs
- Vehicle categories
- Cambodian license plates

Collection and tracking artifacts:
- `data/datasets/scripts/collection_tracker.py`
- `docs/final-year-project/DATASET-COLLECTION-STATUS.md`

## 3.3.2 Data Quality and Preprocessing

Quality pipeline included:
- image quality checks (`verify_image_quality.py`)
- duplicate removal (`dedup_images.py`)
- annotation verification (`verify_labels.py`)
- train/val split management (`verify_labels.py --update-yaml`)

## 3.3.3 Annotation Method

Annotation was performed in YOLO format with class mapping consistency checks. Annotation quality was validated before each training cycle.

## 3.4 AI Model Development Methodology

## 3.4.1 Detection Model

Model family: YOLOv11 (Ultralytics)

Training process:
1. Bootstrap baseline model run
2. Fine-tuned v2 training with Cambodia-oriented augmentation and cosine LR
3. Post-training evaluation with confusion matrix, per-class AP, and latency/FPS

## 3.4.2 OCR Method

OCR approach:
- EasyOCR for plate text extraction
- custom normalization and substring extraction to improve practical exact matches

Evaluation method:
- CER (Character Error Rate)
- Exact Match Rate

## 3.5 Toolchain and Environment

Core tools used:
- Source control: Git + GitHub
- Backend: Django 5 + DRF
- AI service: FastAPI + Ultralytics + EasyOCR
- Frontend: React + Vite + TypeScript
- Data storage: PostgreSQL
- Queue/cache: Redis + Celery
- Deployment: Docker Compose + Nginx + Certbot
- Testing: pytest, integration test suites, UAT forms

## 3.6 Methodological Traceability

Project execution preserved traceability from requirement to evidence:
- checklist tracking: `docs/CHECKLIST-MASTER.md`
- stage reports: `docs/final-year-project/`
- reproducible artifacts: `ai-service/runs/evaluation/final/`
- deployment runbooks: `deploy/scripts/`

## 3.7 Summary

The methodology combined software engineering rigor with AI experimentation discipline. This hybrid method allowed CamTraffic to deliver both a functioning enforcement system and measurable AI evaluation outputs suitable for final-year thesis requirements.
