# CamTraffic Documentation

Project documentation for the AI-Based Traffic Sign Detection and Traffic Law Enforcement System (Cambodia).

---

## Phase 0 — Research & Planning

| Document | Description |
|----------|-------------|
| [PRD.md](./PRD.md) | Product vision, problem, objectives, scope, stakeholders |
| [SRS.md](./SRS.md) | Functional & non-functional requirements, user stories |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, tech stack, API design |
| [SYSTEM-WORKFLOW.md](./SYSTEM-WORKFLOW.md) | End-to-end workflows: admin, officer, driver, AI training vs detection |
| [ARCHITECTURE-DIAGRAMS.md](./ARCHITECTURE-DIAGRAMS.md) | Use case, activity, sequence, class, ER diagrams |
| [DATABASE.md](./DATABASE.md) | ER diagram, table descriptions, migrations |
| [SCHEMA.sql](./SCHEMA.sql) | Legacy SQL schema reference |
| [CHECKLIST.md](./CHECKLIST.md) | Enterprise master checklist (150 tasks, Phases 1–13) |
| [tasks/README.md](./tasks/README.md) | Per-task specs (`Task001.md` … `Task150.md`) for Cursor AI workflow |
| [FOLDER-MAP.md](./FOLDER-MAP.md) | Repository directory map |

---

## Phase 14 — User & Technical Guides

| Document | Description |
|----------|-------------|
| [USER-MANUAL.md](./USER-MANUAL.md) | Overview for admin, officer, and driver |
| [INSTALLATION-GUIDE.md](./INSTALLATION-GUIDE.md) | Local setup, Docker, production |
| [THESIS.md](./THESIS.md) | 7-chapter thesis outline |
| [GLOSSARY.md](./GLOSSARY.md) | Terms and abbreviations |
| [backend/docs/API.md](../backend/docs/API.md) | Full REST API catalog (~120 routes) |
| [packages/docs/DEVELOPER-GUIDE.md](../packages/docs/DEVELOPER-GUIDE.md) | Contributor guide |

---

## Final-year project (`final-year-project/`)

| Folder / file | Description |
|---------------|-------------|
| [thesis/](./final-year-project/thesis/) | Chapter drafts, finals, references, appendices |
| [THESIS-SUBMISSION.md](./final-year-project/THESIS-SUBMISSION.md) | Export and submission checklist |
| [PRESENTATION-SLIDES.md](./final-year-project/PRESENTATION-SLIDES.md) | 15-slide defense outline |
| [CAMTRAFFIC-FINAL-PRESENTATION.pptx](./final-year-project/CAMTRAFFIC-FINAL-PRESENTATION.pptx) | PowerPoint deck |
| [DEMO-SCRIPT.md](./final-year-project/DEMO-SCRIPT.md) | 7-scene live demo |
| [DEFENSE-PREPARATION.md](./final-year-project/DEFENSE-PREPARATION.md) | Q&A preparation |
| [diagrams/](./final-year-project/diagrams/) | Use case, class, sequence, deployment UML |
| [manuals/](./final-year-project/manuals/) | Admin, officer, driver role manuals |
| [MAINTENANCE-GUIDE.md](./final-year-project/MAINTENANCE-GUIDE.md) | Ops runbook |
| [DOCUMENTATION-VALIDATION-REPORT.md](./final-year-project/DOCUMENTATION-VALIDATION-REPORT.md) | Phase 14 sign-off |
| [UAT-REPORT.md](./final-year-project/UAT-REPORT.md) | User acceptance testing |
| [PERFORMANCE-EVALUATION.md](./final-year-project/PERFORMANCE-EVALUATION.md) | Benchmarks |
| [STAGE10-PRODUCTION-DEPLOYMENT-REPORT.md](./final-year-project/STAGE10-PRODUCTION-DEPLOYMENT-REPORT.md) | Production deployment |

---

## Deployment

| Document | Description |
|----------|-------------|
| [deploy/README.md](../deploy/README.md) | Production Docker runbook |
| [deploy/env/BACKUP.md](../deploy/env/BACKUP.md) | Backup policy |

---

## Reports

Benchmark and dataset quality CSV exports are under [`reports/`](./reports/).

---

## Quick links (codebase)

| Area | Path |
|------|------|
| Backend API | `backend/camtraffic/urls.py` |
| Admin portal | `frontend-admin/routes.tsx` |
| User portal | `frontend-user/routes.tsx` |
| AI weights | `ai/weights/` |
| Docker stack | `deploy/docker/docker-compose.prod.yml` |
