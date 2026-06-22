# CamTraffic — Architecture Documentation

Professional project structure and architecture reference for the **AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia**.

> **Status:** Analysis snapshot **2026-06-19** · Codebase ~53% complete · Docker/Redis planned  
> **Do not implement from these docs alone** — cross-check [TASKS.md](../../TASKS.md) before building.

---

## Documents

| # | Document | Description |
| --- | --- | --- |
| 1 | [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) | Repository layout — current + target (Docker) |
| 2 | [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) | Django REST API, apps, AI pipeline, services |
| 3 | [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) | React + Vite + Tailwind dual-portal design |
| 4 | [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) | Domain model, ER overview, table groups |
| 5 | [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) | Sprints, phases, priorities, milestones |

---

## Related Project Docs

| Document | Purpose |
| --- | --- |
| [README.md](../../README.md) | Project entry point |
| [PRD.md](../../PRD.md) | Product requirements |
| [PLAN.md](../../PLAN.md) | 12-month rollout plan |
| [SYSTEM_FLOW.md](../../SYSTEM_FLOW.md) | Enforcement lifecycle flows |
| [DATABASE_SCHEMA.md](../../DATABASE_SCHEMA.md) | Column-level schema reference |
| [API_SPEC.md](../../API_SPEC.md) | REST endpoint specification |
| [TECH_STACK.md](../../TECH_STACK.md) | Technology choices |

---

## Stack Summary

```text
React (Vite + Tailwind)  →  Django REST Framework  →  PostgreSQL
                                    ↓
                              Redis (cache/queue)
                                    ↓
                              Celery workers
                                    ↓
                         YOLOv8 + OpenCV + EasyOCR

Deployment: Docker Compose (dev/staging) · Nginx + Gunicorn (production)
```
