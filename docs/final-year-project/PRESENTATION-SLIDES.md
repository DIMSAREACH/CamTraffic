# CamTraffic — Final Presentation Slides (15 Slides)

**Task 401** · Defense / Viva · Duration: 15–20 minutes  
**Companion files:** Tasks 403–406 embedded below · Export: `CAMTRAFFIC-FINAL-PRESENTATION.pptx`

---

## Slide 1 — Title

**Design and Develop of an AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia**

- **Project:** CamTraffic
- **Author:** [Your Name]
- **Supervisor:** [Supervisor Name]
- **Institution:** [University]
- **Date:** July 2026

**Speaker notes:** Introduce yourself, project title, and one-line pitch: "AI-assisted sign detection connected to a full enforcement workflow."

---

## Slide 2 — Problem Statement

**Traffic sign enforcement in Cambodia faces four gaps:**

| Gap | Impact |
|-----|--------|
| Limited continuous monitoring | Signs violated without detection |
| Weak evidence linkage | Fines lack standardized photos |
| Delayed driver notification | Low transparency |
| Fragmented workflow | Detection ≠ fines ≠ appeals |

**Speaker notes:** Connect to real road safety context. Cite WHO road injury statistics briefly.

---

## Slide 3 — Project Objectives

| # | Objective | Status |
|---|-----------|:------:|
| O1 | Detect Cambodian traffic signs (YOLO) | ✅ mAP@50 = 0.908 |
| O2 | License plate OCR integration | ✅ Pipeline live |
| O3 | Violation → fine → appeal workflow | ✅ Full API |
| O4 | Admin + officer + citizen portals (3 domains) | ✅ React SPAs |
| O5 | Production deployment | ✅ Docker 8-service stack |

**Speaker notes:** Emphasize end-to-end scope—not just a model demo.

---

## Slide 4 — System Overview (Multi-Domain)

**Three domains — not one Admin Dashboard:**

```
Administration     Traffic Operations     Citizen Service
/admin/*           /officer/*             /citizen/*
:5174              :5173                  :5173
users, RBAC,       AI review,             own vehicles,
cameras, audit     approve, issue fine    fines, appeals
         \               |               /
          \              |              /
           → Django /api/v1/{admin|officer|citizen} ←
                         ↓
              YOLO11n + EasyOCR + PostgreSQL
```

| Domain | Who | Cannot |
|--------|-----|--------|
| Administration | Admin | Issue fines / approve cases |
| Traffic Operations | Officer | Manage RBAC / AI model deploy |
| Citizen Service | Driver | Edit violations / see others |

**Speaker notes:** This is the enterprise architecture examiners expect. Cite Chapter 4.2.5.

---

## Slide 5 — Architecture (Task 403)

**Modular monolith — multi-domain presentation layer**

| Layer | Components |
|-------|------------|
| Client | React 19 + Vite (`frontend-admin`, `frontend-user` with `officer/` + `citizen/`) |
| API | Django REST — `/api/v1/admin|officer|citizen` + domain apps |
| AI | YOLO11n embedded + optional ai-worker |
| Data | PostgreSQL 16, Redis 7 |
| Edge | Nginx + Let's Encrypt (production) |

**Diagram:** `docs/final-year-project/thesis/CHAPTER-4-2-5-MULTI-DOMAIN-ARCHITECTURE.md`

**Tech stack table:**

| Area | Technology |
|------|------------|
| Backend | Python 3.11, Django 5, DRF, Celery |
| Frontend | React 19, TypeScript, Tailwind |
| AI | Ultralytics YOLO11n, EasyOCR |
| DevOps | Docker Compose, GitHub Actions CI |

**Speaker notes:** Clarify AI runs in-process in dev; production can isolate ai-worker container.

---

## Slide 6 — Use Cases & Roles

**Figure:** Use case diagram (Admin, Officer, Driver/Citizen, AI Engine)

| Role | Domain routes | Key actions |
|------|---------------|-------------|
| Admin | `/admin/*` | Users, cameras, RBAC, backup, audit |
| Officer | `/officer/*` | Detect signs, confirm violations, issue fines |
| Driver | `/citizen/*` | View fines, pay (demo), submit appeals |

**Speaker notes:** Reference `diagrams/USE-CASE-DIAGRAM.md` and permission matrix in Chapter 4.2.5.

---

## Slide 7 — AI Pipeline (Task 404)

**Detection → OCR → Rules → Records**

```
Image upload / webcam frame
    ↓
YOLO11n sign detection (10 classes, 640px)
    ↓
Vehicle bbox + EasyOCR plate read
    ↓
ViolationRule engine (sign_class_key match)
    ↓
AIDetectionLog → Violation → Fine → Notification
```

**API:** `POST /api/ai/detect/` · Weights: `ai/weights/best_v2.pt`

**Speaker notes:** Walk through sequence diagram. Mention officer-in-the-loop confirmation.

---

## Slide 8 — Dataset (Task 405)

**Collection statistics** (source: `ai/datasets/manifests/collection_stats.json`)

| Category | Target | Collected |
|----------|-------:|----------:|
| Traffic signs (full catalog) | 2,980 | 2,840 |
| Vehicles | — | 1,258 |
| License plates | 1,253 | 503 |
| Road footage frames | **8,848** | roadmap |
| **Sign taxonomy** | **31 classes** | full CVAT map |
| **Production model** | **10 classes** | `dataset_10/` |

**31-class taxonomy** → full Cambodian sign registry  
**10-class subset** → production YOLO weights (`best_v2.pt`)

**Speaker notes:** Explain why 10-class model for thesis demo vs 31-class future work.

---

## Slide 9 — Model Results (Task 406)

**YOLO11n — 10-class production model**

| Metric | Value | Target |
|--------|------:|--------|
| **mAP@50** | **0.908** | ≥ 0.85 ✅ |
| mAP@50-95 | 0.796 | — |
| Precision | 0.960 | High |
| Recall | 0.196 | Officer review |
| CPU FPS | ~20 | ≥ 15 ✅ |

**Figures to insert:**
- PR curve: `ai/runs/detect/dataset_10_train/PR_curve.png`
- Confusion matrix: `ai/runs/detect/dataset_10_train/confusion_matrix.png`

**OCR note:** CER 2.40 — exact match 0%; manual officer lookup required.

**Speaker notes:** High precision = reliable when model fires. Recall limitation → human confirmation.

---

## Slide 10 — Live Demo Preview

**7-scene demo** (`DEMO-SCRIPT.md` — ~12 min)

1. Admin login → `/admin` KPIs  
2. Live camera grid  
3. AI detection (upload/webcam)  
4. Violation auto-create  
5. Officer → `/officer` confirm + issue fine  
6. Citizen → `/citizen` portal + notification  
7. PDF/Excel report export  

**Speaker notes:** Transition to live demo or pre-recorded video backup.

---

## Slide 11 — Testing & UAT

| Suite | Result |
|-------|:------:|
| Backend API + RBAC tests | PASS |
| Security (injection, uploads) | PASS |
| Playwright E2E (4 tests) | PASS |
| UAT (admin/officer/driver) | PASS |
| Health p95 latency | PASS (< 250 ms) |

**Evidence:** `UAT-REPORT.md`, `PERFORMANCE-EVALUATION.md`

---

## Slide 12 — Deployment

**Production stack (8 Docker services):**

nginx · backend · ai-worker · celery-worker · celery-beat · postgres · redis · certbot

```bash
npm run docker:prod:up
bash deploy/scripts/deploy_production.sh
```

**Speaker notes:** Mention CI pipeline in `.github/workflows/ci.yml`.

---

## Slide 13 — Key Achievements

| Deliverable | Count |
|-------------|------:|
| Checklist tasks completed | 440 / 440 |
| API endpoints | ~120 |
| Django apps | 16 |
| Thesis chapters | 7 |
| Documentation files | 40+ |

**Hybrid contribution:** AI perception + expert-system rules + full-stack enforcement IT

---

## Slide 14 — Limitations & Future Work

**Limitations:**
- 10-class vs 31-class catalog
- OCR needs Cambodia-specific training
- Web-only (no mobile app)
- Demo payment (no real gateway)

**Future:**
- Expand dataset toward 8,848 road frames
- GPU live RTSP processing
- National vehicle registry API
- Pilot with traffic police

---

## Slide 15 — Thank You / Q&A

**CamTraffic**  
Repository: https://github.com/SareachGenZ/CamTraffic

**Questions?**

**Backup materials:**
- Thesis: `docs/final-year-project/thesis/`
- Demo script: `DEMO-SCRIPT.md`
- Q&A prep: `DEFENSE-PREPARATION.md`

**Speaker notes:** Invite questions. Have laptop ready with demo environment.

---

## Slide index (Tasks 401–406)

| Task | Slide(s) |
|------|----------|
| 401 | All 15 slides |
| 403 | Slide 5 — Architecture |
| 404 | Slide 7 — AI Pipeline |
| 405 | Slide 8 — Dataset |
| 406 | Slide 9 — Model Results |
