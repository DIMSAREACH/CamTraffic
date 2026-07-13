# Chapter 3 — Methodology [DRAFT]

**Task 384** · CamTraffic Final Year Project · 2026

---

## 3.1 Software Development Life Cycle

CamTraffic followed an iterative SDLC mapped to 19 enterprise phases (540 tasks). Phases 0–2 covered planning and database design; Phases 3–6 authentication, backend, and frontends; Phases 7–11 AI dataset through system integration; Phases 12–13 testing and deployment; Phases 14–15 documentation and thesis writing.

Each phase produced verifiable artifacts (migrations, API routes, test suites, Docker files) tracked in `docs/CHECKLIST.md`.

---

## 3.2 Requirements Gathering

Requirements were derived from:

- Product Requirements Document (`docs/PRD.md`)
- Software Requirements Specification (`docs/SRS.md`)
- Stakeholder roles: administrator, traffic police, driver

Functional requirements include sign detection, violation recording, fine management, and appeals. Non-functional requirements include JWT security, p95 API latency targets, and bilingual UI.

---

## 3.3 Dataset Collection

Images were collected from public road scenes, synthetic augmentations, and catalog references. A production subset of **10 sign classes** was defined in `ai/dataset_10/classes.txt`:

1. NO_ENTRY  
2. NO_LEFT_TURN  
3. NO_RIGHT_TURN  
4. NO_U_TURN  
5. NO_PARKING  
6. M_STOP  
7. P_SPEED_LIMIT_20_KM_H  
8. P_SPEED_LIMIT_50_KM_H  
9. W_PEDESTRIAN_CROSSING  
10. I_ONE_WAY_TRAFFIC  

A broader 31-class catalog exists for future expansion; production inference uses the 10-class model (`best_v2.pt`).

---

## 3.4 Annotation

Labels follow YOLO format: `class_id x_center y_center width height` (normalized 0–1). Quality audits documented in dataset build reports. Train/validation splits prevent leakage across sign instances.

---

## 3.5 Model Training

| Parameter | Value |
|-----------|-------|
| Architecture | YOLO11n |
| Input size | 640 px |
| Epochs | 10 (production run) |
| Framework | Ultralytics |
| Output weights | `ai/weights/best_v2.pt` |

Training artifacts: `ai/runs/detect/dataset_10_train/` (curves, confusion matrix, results.csv).

---

## 3.6 Evaluation Metrics

- **mAP@50** — primary detection metric  
- **mAP@50-95** — stricter IoU range  
- **Precision / Recall** — per-class balance  
- **FPS** — CPU inference throughput  

---

## 3.7 System Testing Methodology

| Layer | Method |
|-------|--------|
| Unit | Django `TestCase`, pytest |
| API | `backend/tests/api/` |
| Security | RBAC, SQL injection, upload MIME |
| Frontend | Vitest component tests |
| E2E | Playwright (4 scenarios) |
| UAT | Role-based manual matrix |
| Performance | Health benchmark script |

---

*Draft version — see `CHAPTER-3-METHODOLOGY-FINAL.md` for submission copy.*
