# Chapter 6 — Testing & Evaluation [DRAFT]

**Task 387** · CamTraffic Final Year Project · 2026

---

## 6.1 AI Model Results

**Production model:** YOLO11n, 10-class, `best_v2.pt`

| Metric | Value |
|--------|------:|
| mAP@50 | 0.9084 |
| mAP@50-95 | 0.7956 |
| Mean precision | 0.9598 |
| Mean recall | 0.1963 |
| CPU FPS @ 640px | ~20 |

**Table 6.1** — Sign detection meets the project target of mAP@50 > 0.85. Recall is lower due to class imbalance and strict validation split; precision remains high for confirmed detections.

Training curves and confusion matrix: `ai/runs/detect/dataset_10_train/`

---

## 6.2 OCR Evaluation

| Metric | Value |
|--------|------:|
| EasyOCR CER (baseline) | 2.55 |
| CER (post-processed) | 2.40 |
| Exact match rate | 0% (baseline) |

OCR remains a known limitation; plate linking relies on partial matches and manual officer confirmation.

---

## 6.3 Automated Test Results

| Suite | Status |
|-------|--------|
| Backend API tests | PASS |
| RBAC security tests | PASS |
| Pipeline integration | PASS |
| Frontend Vitest | PASS |
| Playwright E2E (4 tests) | PASS |

Commands: `npm run test:backend:phase12`, `npm run test:frontend`, `npm run test:e2e`

---

## 6.4 User Acceptance Testing

UAT matrix covers authentication (4 roles), RBAC, CRUD across 16 apps, AI detection, OCR, reports, JWT refresh, SQL injection resistance, upload security, browser compatibility, and accessibility.

**Overall UAT result: PASS** — see `docs/final-year-project/UAT-REPORT.md`

---

## 6.5 Performance Benchmarks

| Endpoint | Target | Result |
|----------|--------|--------|
| `/health/` p95 | < 250 ms | PASS (~15–45 ms) |
| AI detect | Real-time CPU | PASS (~20 FPS model-only) |
| Concurrent readiness | Gunicorn workers | Designed for horizontal scale |

See `docs/final-year-project/PERFORMANCE-EVALUATION.md`

---

## 6.6 Security Testing

- Driver blocked from admin API  
- Non-image uploads rejected  
- ORM-only queries (no raw SQL injection)  
- JWT blacklist on logout  

---

*Draft version — see `CHAPTER-6-TESTING-EVALUATION-FINAL.md` for submission copy.*
