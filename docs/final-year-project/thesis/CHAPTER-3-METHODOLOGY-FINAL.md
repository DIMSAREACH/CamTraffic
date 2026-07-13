# Chapter 3 — Methodology

**CamTraffic Final Year Project**

---

## 3.1 Research and Development Approach

This project follows a structured Software Development Life Cycle (SDLC) organized into 19 phases and 540 tracked tasks (`docs/CHECKLIST.md`). The approach combines:

- **Waterfall elements** for foundational design (database schema, API contracts)
- **Agile iterations** for feature delivery (frontend pages, AI integration)
- **ML lifecycle** stages for dataset → train → evaluate → deploy

Phases 0–6 established requirements, authentication, backend APIs, and both frontends. Phases 7–11 covered AI dataset work through production integration. Phases 12–13 validated quality and deployment. Phases 14–15 produced documentation and this thesis.

---

## 3.2 Requirements Engineering

### 3.2.1 Stakeholders

| Stakeholder | Interest |
|-------------|----------|
| System administrator | User management, cameras, audit, backup |
| Traffic police | Detection, violations, fines, appeals review |
| Driver | View violations, pay fines, submit appeals |
| Examiner / institution | Demonstrable thesis artifact |

### 3.2.2 Requirements Documents

- **PRD** (`docs/PRD.md`) — vision, objectives, scope, personas  
- **SRS** (`docs/SRS.md`) — functional requirements (FR-001…), non-functional requirements (NFR-001…)

Functional requirements trace to API endpoints and UI routes. Non-functional requirements include JWT security, API response targets, and bilingual UI.

---

## 3.3 Dataset Methodology

### 3.3.1 Sign Taxonomy

Production inference uses **10 classes** defined in `ai/dataset_10/classes.txt`:

| ID | Class key | Sign type |
|----|-----------|-----------|
| 0 | NO_ENTRY | Regulatory — no entry |
| 1 | NO_LEFT_TURN | Prohibitory — no left turn |
| 2 | NO_RIGHT_TURN | Prohibitory — no right turn |
| 3 | NO_U_TURN | Prohibitory — no U-turn |
| 4 | NO_PARKING | Prohibitory — no parking |
| 5 | M_STOP | Mandatory — stop |
| 6 | P_SPEED_LIMIT_20_KM_H | Prohibitory — 20 km/h |
| 7 | P_SPEED_LIMIT_50_KM_H | Prohibitory — 50 km/h |
| 8 | W_PEDESTRIAN_CROSSING | Warning — pedestrian crossing |
| 9 | I_ONE_WAY_TRAFFIC | Information — one way |

A broader 31-class catalog supports future expansion documented in dataset build reports.

### 3.3.2 Collection and Split

Images sourced from road photography, catalog references, and augmentation. YOLO train/val split enforced at image level to prevent leakage. Quality audits recorded label consistency and class balance.

---

## 3.4 Annotation Protocol

Annotations use YOLO normalized format:

```
<class_id> <x_center> <y_center> <width> <height>
```

Tools: labelImg / Roboflow-compatible export. Each bounding box tightly encloses one sign instance. Multiple signs per image receive independent labels.

---

## 3.5 Model Training Procedure

| Hyperparameter | Setting |
|----------------|---------|
| Base model | YOLO11n (Ultralytics) |
| Image size | 640 × 640 |
| Epochs | 10 (production run `dataset_10_train`) |
| Optimizer | AdamW (Ultralytics default) |
| Augmentation | Mosaic, flip, HSV (framework defaults) |
| Output | `ai/weights/best_v2.pt` |

Training executed on development hardware with CPU/GPU as available. Artifacts stored under `ai/runs/detect/dataset_10_train/` including `results.csv`, PR curves, and confusion matrices.

---

## 3.6 Evaluation Methodology

### 3.6.1 Detection Metrics

- **Precision** — fraction of detections that are correct  
- **Recall** — fraction of ground truth objects detected  
- **mAP@50** — mean average precision at IoU 0.50  
- **mAP@50-95** — COCO-style averaged IoU thresholds  
- **FPS** — inference throughput on standardized hardware  

### 3.6.2 System Metrics

- API latency (health endpoint p95)  
- UAT scenario pass rate by role  
- Automated test pass rate  

---

## 3.7 Software Testing Strategy

| Level | Tool / method | Scope |
|-------|---------------|-------|
| Unit | Django TestCase | Models, serializers, utilities |
| API | pytest / manage.py test | 60+ endpoints |
| Integration | `backend/tests/integration/` | Auth → detect → fine flow |
| Security | `backend/tests/security/` | RBAC, injection, uploads |
| Frontend | Vitest | Shared components, services |
| E2E | Playwright | Login, portal routing |
| UAT | Manual matrix | Role workflows |
| Performance | `health-benchmark.mjs` | Latency baselines |

---

## 3.8 Deployment Methodology

Production packaging uses Docker Compose with eight services (nginx, backend, ai-worker, celery-worker, celery-beat, postgres, redis, certbot). Deployment scripts automate migrate, seed, and health verification (`deploy/scripts/deploy_production.sh`).

---

## 3.9 Summary

Chapter 3 defined the SDLC, dataset and training procedures, evaluation metrics, and testing strategy employed throughout CamTraffic. Chapter 4 presents the resulting system design.

---

**Word count (approx.):** 720 · **Status:** Final submission version
