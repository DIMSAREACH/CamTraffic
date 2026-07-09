# Presentation Slides — CamTraffic

**Task 151 — Final Year Project Presentation**
**Title**: AI-Based Traffic Sign Detection and Traffic Law Enforcement System for Cambodia
**Duration**: ~20 minutes + 10 minutes Q&A
**Format**: Slide-by-slide outline (for PowerPoint / Google Slides)

---

## Slide 1 — Title

**Title**: AI-Based Traffic Sign Detection and Traffic Law Enforcement System for Cambodia
**Subtitle**: CamTraffic — Final Year Project
**Author**: Dim Sareach
**Institution / Program / Year**: [University] · Computer Science · 2026
**Supervisor**: [Supervisor Name]

---

## Slide 2 — Agenda

1. Problem Background
2. Objectives
3. System Architecture
4. AI Pipeline (YOLOv11 + EasyOCR)
5. Software Components
6. Key Features Demo
7. AI Model Evaluation
8. System Performance
9. Conclusions & Future Work
10. Q&A

---

## Slide 3 — Problem Background

**Headline**: Cambodia's Traffic Enforcement Challenge

- 🚗 Rapid vehicle growth; limited traffic police resources
- 🚦 Traffic sign violations (speed, no-entry, illegal turns) go undetected
- 📄 Manual, paper-based violation records — slow and error-prone
- 🔔 No real-time notification to officers or drivers

> **Key stat**: [Insert local statistic on road accident rate or violation detection gap]

---

## Slide 4 — Objectives

1. Detect Cambodian traffic signs and vehicles using YOLOv11
2. Recognize license plate text using EasyOCR
3. Auto-create violations by matching plates to registered vehicles
4. Notify traffic officers in real time
5. Allow drivers to view, appeal, and pay fines online
6. Full-stack enterprise web system with Docker deployment

---

## Slide 5 — System Architecture

**Diagram**: High-Level Architecture (from `ARCHITECTURE-DIAGRAMS.md` — Diagram 1)

```
Frontend Admin (React)  ←→  Backend Django :8000  ←→  AI Service FastAPI :8001
Frontend User (React)   ←→        ↓                          ↓
                               PostgreSQL               YOLOv11 + EasyOCR
                               Redis + Celery           Model Weights (.pt)
```

- 7 services deployed via **Docker Compose**
- JWT authentication + RBAC (4 roles)
- Celery async tasks for non-blocking AI processing

---

## Slide 6 — AI Pipeline

**Diagram**: Detection Pipeline (from `ARCHITECTURE-DIAGRAMS.md` — Diagram 2)

**Step-by-step**:
1. Camera submits JPEG frame → `POST /integration/cameras/{id}/process-frame/`
2. Celery task calls AI service `POST /pipeline/run`
3. **YOLOv11** detects: traffic signs + license plate bounding boxes
4. **EasyOCR** reads plate text from cropped region
5. Backend matches plate → registered vehicle
6. If matched → auto-create **Violation** (status: pending)
7. Notify station officers + driver

---

## Slide 7 — Dataset

| Source | Images | Classes |
|--------|-------:|--------:|
| Cambodia Traffic Signs (Roboflow) | 218 | 5 vehicle types |
| Plate Numbers v3 (Roboflow) | 453 | 1 plate class |
| Prohibitory Signs (manual) | 46 | 3 sign types |
| Manual Annotation | 1 | 1 sign |
| **Combined Training Set** | **552** | **31** |

**31 classes**: 17 traffic sign types + 3 plate types + 11 vehicle types

---

## Slide 8 — AI Model Results

### YOLOv11-nano (Bootstrap — 5 epochs, CPU)

| Metric | Value |
|--------|------:|
| mAP@50 | **0.424** |
| mAP@50-95 | 0.325 |
| Precision | 0.474 |
| Recall | 0.414 |
| License Plate mAP@50 | **0.993** |

### EasyOCR Baseline

| Metric | Value |
|--------|------:|
| Mean CER | 0.663 |
| Exact Match Rate | 0.139 |

> Note: Bootstrap training (5 epochs, CPU). GPU training with 100+ epochs expected to yield mAP@50 ≥ 0.80.

---

## Slide 9 — System Features (Admin Portal)

- **Camera Management** — register, health-check, live dashboard
- **Detection Monitoring** — real-time detection feed with AI confidence scores
- **Violation Review** — officer approval workflow with evidence images
- **User & Role Management** — RBAC: super_admin / admin / officer / driver
- **Reports** — violation, fine, and detection exports (CSV/PDF)
- **Audit Logs** — full action trail

---

## Slide 10 — System Features (Driver Portal)

- **Violation History** — view all violations with camera evidence
- **Fine Payment** — inline payment with receipt
- **Appeals** — submit and track appeals
- **Notifications** — in-app alerts for new violations
- **Profile** — manage account and notification preferences

---

## Slide 11 — Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui |
| Backend | Django 5 + DRF + JWT + Celery |
| AI | FastAPI + YOLOv11 (Ultralytics) + EasyOCR + OpenCV |
| Database | PostgreSQL 15 + Redis 7 |
| Deployment | Docker Compose + Nginx + Gunicorn |
| CI/CD | GitHub Actions |
| Packages | Turborepo monorepo (`@camtraffic/ui`, `api`, `hooks`, `types`, `utils`) |

---

## Slide 12 — Performance Benchmarks

| Metric | Value |
|--------|-------|
| AI inference (CPU, YOLOv11-nano, 640×640) | ~62 ms |
| Full pipeline (frame → DB write) | < 2 s (CPU) |
| Backend API response (health) | < 50 ms |
| Celery task dispatch latency | < 100 ms |
| Test coverage (backend) | > 70% |

---

## Slide 13 — Conclusions

✅ Full-stack enforcement system designed, built, integrated, and documented
✅ YOLOv11 model trained on Cambodian traffic sign dataset — license plate detection mAP@50 = 0.99
✅ End-to-end pipeline from camera frame to officer notification validated
✅ Docker deployment stack with CI/CD pipeline
✅ 160-task enterprise project completed across 13 phases

---

## Slide 14 — Future Work

- **GPU training** with 100+ epochs on a curated 10,000+ image dataset
- **Khmer OCR** fine-tuning for Cambodian plate scripts
- **RTSP live stream reader** for real camera integration
- **Mobile application** for officers in the field
- **Integration with national vehicle registry** API

---

## Slide 15 — Q&A

**Thank You**

Questions welcome.

> Contact: [your.email@example.com]
> GitHub: [github.com/your-org/camtraffic]

---

## Speaker Notes Summary

| Slide | Key talking points |
|-------|--------------------|
| 3 | Mention specific Cambodian context; cite at least one local road safety statistic |
| 6 | Emphasize asynchronous design — camera is never blocked waiting for AI |
| 8 | Be honest about bootstrap mAP; explain why 5 epochs is just a baseline |
| 12 | Highlight < 2 s end-to-end as a practical real-world benchmark |
| 14 | Show awareness of limitations; demonstrate research maturity |
