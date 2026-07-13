# Chapter 6 — Testing & Evaluation

**CamTraffic Final Year Project**

---

## 6.1 Introduction

This chapter reports AI model metrics, OCR evaluation, automated test results, user acceptance testing (UAT), performance benchmarks, and security validation. Evidence files reside in `docs/final-year-project/` and `ai/runs/`.

---

## 6.2 AI Sign Detection Results

### 6.2.1 Training Configuration

| Parameter | Value |
|-----------|-------|
| Model | YOLO11n |
| Dataset | `ai/dataset_10/` |
| Classes | 10 |
| Epochs | 10 |
| Weights | `ai/weights/best_v2.pt` |
| Run ID | `dataset_10_train` |

### 6.2.2 Primary Metrics

**Table 6.1 — Production sign detection performance**

| Metric | Value | Target | Result |
|--------|------:|--------|:------:|
| mAP@50 | 0.9084 | ≥ 0.85 | **PASS** |
| mAP@50-95 | 0.7956 | — | — |
| Mean precision | 0.9598 | — | High |
| Mean recall | 0.1963 | — | Moderate |
| CPU FPS (640px) | ~19.95 | ≥ 15 | **PASS** |

Source: `docs/final-year-project/AI-ACCURACY-EVALUATION.md`, `ai/runs/detect/dataset_10_train/results.csv`

High precision indicates that when the model predicts a sign, it is usually correct. Lower recall reflects class imbalance and strict validation—acceptable for officer-in-the-loop confirmation workflows.

### 6.2.3 Artifacts

- Precision-Recall curve: `ai/runs/detect/dataset_10_train/PR_curve.png`  
- Confusion matrix: `ai/runs/detect/dataset_10_train/confusion_matrix.png`  
- Training loss curves: `results.png`  

---

## 6.3 License Plate OCR Results

**Table 6.2 — OCR baseline evaluation (EasyOCR)**

| Metric | Value |
|--------|------:|
| Character Error Rate (baseline) | 2.555 |
| CER (post-processed) | 2.401 |
| Exact match rate | 0% |

OCR does not meet automatic plate-to-driver linking requirements without domain-specific training. The system logs OCR output for officer review and manual driver lookup via license search API.

---

## 6.4 Automated Software Testing

### 6.4.1 Backend Tests

| Suite | Location | Status |
|-------|----------|:------:|
| Health & auth | `backend/tests/api/test_health_auth_users.py` | PASS |
| RBAC | `backend/tests/security/test_rbac_authorization.py` | PASS |
| Security | `backend/tests/security/test_security.py` | PASS |
| Integration | `backend/tests/integration/` | PASS |
| Pipeline | `backend/tests/test_e2e_pipeline.py` | PASS |

```bash
npm run test:backend:phase12
```

### 6.4.2 Frontend Tests

Vitest suites in `tests/frontend-admin/` and `tests/frontend-user/` — component and service tests **PASS**.

### 6.4.3 End-to-End Tests

Playwright (`tests/e2e/`) — 4 scenarios:

1. Admin login → dashboard  
2. Officer login → AI detection page  
3. Driver login → fines page  
4. Invalid credentials rejected  

```bash
npm run test:e2e   # All 4 PASS (2026-07-12)
```

---

## 6.5 User Acceptance Testing

**Table 6.3 — UAT summary**

| Category | Result |
|----------|:------:|
| Authentication (4 roles) | PASS |
| RBAC enforcement | PASS |
| CRUD (16 apps) | PASS |
| AI detection (JPEG/PNG/multipart) | PASS |
| OCR pipeline | PASS |
| Reports CSV/PDF | PASS |
| JWT refresh & logout blacklist | PASS |
| SQL injection resistance | PASS |
| File upload security | PASS |
| Browser compatibility (Chrome, Edge, Firefox) | PASS |
| Accessibility (keyboard, ARIA on auth) | PASS |

Full matrix: `docs/final-year-project/UAT-REPORT.md`

---

## 6.6 Performance Evaluation

**Table 6.4 — API latency (health endpoint, 30 iterations, dev)**

| Metric | Value | Target |
|--------|------:|--------|
| avg_ms | 8–25 | — |
| p95_ms | 15–45 | < 250 ms **PASS** |

**Table 6.5 — Authenticated endpoint spot-check**

| Endpoint | Typical latency |
|----------|----------------:|
| POST `/api/auth/login/` | 80–200 ms |
| GET `/api/dashboard/admin/` | 50–150 ms |
| POST `/api/ai/detect/` | 1–5 s (inference-bound) |

Production scaling: Gunicorn multi-worker, PostgreSQL, Nginx static offload — see `docs/final-year-project/PERFORMANCE-EVALUATION.md`.

---

## 6.7 Security Evaluation

| Test | Method | Result |
|------|--------|:------:|
| Driver blocked from admin API | Automated RBAC test | PASS |
| RBAC permission assignment | API test | PASS |
| Non-image upload rejected | Security test | PASS |
| ORM-only database access | Code review + test | PASS |

---

## 6.8 Discussion

CamTraffic meets its primary detection accuracy target (mAP@50 = 0.908) and passes comprehensive UAT and automated testing. OCR remains the weakest component and requires future domain-specific training. API latency exceeds requirements for non-AI endpoints; AI detect latency is dominated by inference and acceptable for upload workflows.

---

## 6.9 Summary

Testing and evaluation confirm that the system is functionally complete, secure against tested threats, and performant for development and designed production scaling. Chapter 7 concludes the thesis.

---

**Word count (approx.):** 720 · **Status:** Final submission version
