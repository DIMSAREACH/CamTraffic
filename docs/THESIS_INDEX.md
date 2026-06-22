# CamTraffic — Thesis & Defense Document Index

Use this index when writing Chapter 4–5 or preparing your defense presentation.

---

## Core thesis writing

| Document | Purpose |
|----------|---------|
| [CHAPTER3_SYSTEM_DESIGN.md](./CHAPTER3_SYSTEM_DESIGN.md) | Chapter 3 — Use Case, DFD, ERD, AI, Security, Deployment, UI, Workflow (§3.10–3.18) |
| [CHAPTER4_ANALYSIS_PLANNING.md](./CHAPTER4_ANALYSIS_PLANNING.md) | Chapter 4 — analysis, design, implementation guide (fix Laravel/XAMPP template) |
| [CHAPTER4_IMPLEMENTATION.md](./CHAPTER4_IMPLEMENTATION.md) | Chapter 4 — how the system was built (code mapping) |
| [CHAPTER5_RESULTS.md](./CHAPTER5_RESULTS.md) | Chapter 5 — test results & metrics (auto-sync sections 5.1–5.4) |
| [DEFENSE_SLIDES.md](./DEFENSE_SLIDES.md) | 15-slide presentation outline |
| [../DEMO_SCRIPT.md](../DEMO_SCRIPT.md) | Live demo script (~10 min) |

---

## Evidence & figures

| Folder | Content |
|--------|---------|
| [thesis_evidence/AI-06/](./thesis_evidence/AI-06/) | YOLO training metrics, confusion matrix, predictions |
| [thesis_evidence/TS-03/](./thesis_evidence/TS-03/) | Held-out sign accuracy evaluation |

---

## Technical reference

| Document | Purpose |
|----------|---------|
| [hybrid_detection_flow.md](./hybrid_detection_flow.md) | YOLO + Gemini hybrid flow |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Architecture diagram review & updated figures |
| [ERD.md](./ERD.md) | Entity Relationship Diagram (20 tables, Mermaid) |
| [ERD_UPDATED.md](./ERD_UPDATED.md) | Update your thesis ERD.pdf vs current system |
| [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md) | Section 2.3.6 AI Architecture (Khmer text + diagrams) |
| [API.md](./API.md) | REST API endpoints |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment |
| [SCHEMA.sql](./SCHEMA.sql) | Database schema (partial — see ERD.md for full) |

---

## Maintenance scripts

```bash
# Refresh Chapter 5 metrics from evidence + DB
python scripts/generate_thesis_docs.py --write

# Full defense readiness check (E2E only, or all 130 tests)
python scripts/run_defense_integration.py
python scripts/run_defense_integration.py --full-tests

# Defense PowerPoint (.pptx) with embedded screenshots
python scripts/capture_defense_screenshots.py   # needs backend :8000 + admin :5174
python scripts/generate_mobile_mockup.py
python scripts/generate_defense_slides.py

# Sync 236 bilingual signs
python scripts/sync_all_signs_bilingual.py
```

Screenshot output: `docs/screenshots/` (dashboard, signs, AI detection, violations, evidence, reports, mobile mockup).

---

## Build checklist (from TASK.md)

Phases A–D build steps are complete except **manual demo practice** (`DEMO_SCRIPT.md` step A3). Remaining optional work (Phase E): native mobile, RTSP, Khmer OCR, etc.
