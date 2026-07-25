# CamTraffic — Master Build Prompt Status

Mapped against the Master Build Prompt (Section 12 phases + Section 13 acceptance).
Audited: 2026-07-25. Layout decisions: [`DECISIONS.md`](DECISIONS.md).

**Live smoke (2026-07-25):** `npm run verify:phase1` → **20/20 PASS**; `scripts/verify_real_data.py` → **PASS** (`AI_USE_MOCK=False`). Fixed: reactivated `admin@camtraffic.demo` (`is_active`); hardened `seed:demo-users` check against pagination false-fail.

**Thesis workflow (2026-07-25):** `npm run verify:thesis-demo` → **13/13 PASS** (detect → approve/fine → appeal → review → reports). Defense click path: [`final-year-project/THESIS-DEFENSE-DEMO-WORKFLOW.md`](final-year-project/THESIS-DEFENSE-DEMO-WORKFLOW.md). Approve `select_for_update` bug fixed; plate override on detect for HITL.

**All modules (2026-07-25):** `npm run verify:all-modules` → **50/50 PASS**. Matrix: [`ALL-MODULES-WORKFLOW.md`](ALL-MODULES-WORKFLOW.md). Connected: reject↔AIDetectionLog sync; driver `/citizen/evidence` (own records).

**Platform validate (2026-07-25 re-run):** `npm run validate:production` → **PASS** (deploy artifacts under `infrastructure/deploy/`, phase12 backend 39 OK, frontend admin+user unit tests OK, thesis AI detection stack OK).

**Production task checklist:** [`PRODUCTION-TASK-CHECKLIST.md`](PRODUCTION-TASK-CHECKLIST.md) — 20 phases, ~630 tasks, ~598 done (~100% core web scope).

> **Important:** This repo is **not greenfield**. Phases 1–11 are largely implemented under `src/`. Do not re-scaffold from scratch — close gaps and harden.

---

## Phase tracker (Section 12)

| Phase | Name | Status | Notes |
|------:|------|:------:|-------|
| 1 | Foundation | ✅ | Django + health + Compose; SPA frontends added to root Compose (O8) |
| 2 | Identity & RBAC | ✅ | JWT, OAuth, password reset, roles `admin`/`police`/`driver` |
| 3 | Reference data | ✅ | Signs, vehicles, roads, cameras, stations |
| 4 | AI pipeline (mock first) | ✅ | `AI_USE_MOCK` + live YOLO path in `ai_detection/` |
| 5 | Enforcement core | ✅ | Violations → fines → appeals lifecycle |
| 6 | Notifications & audit | ✅ | In-app + Celery/sync fallback |
| 7 | Dashboards & reporting | ✅ | Role dashboards, PDF/Excel, backup |
| 8 | Real AI weights | ✅ | Weights under `ai/weights/`; training under `ai/training/` |
| 9 | i18n & polish | ✅ | EN/KM LanguageContext, theme, responsive |
| 10 | Hardening | ✅ | [`PRODUCTION-RUNBOOK.md`](PRODUCTION-RUNBOOK.md), prod Compose |
| 11 | Test & docs | 🔄 | Large test suite present; keep SCHEMA/ARCHITECTURE in sync on changes |

Mobile (Flutter) is **out of scope** (Section 11 / D7).

---

## Acceptance criteria (Section 13) — summary

| Criterion | Status |
|-----------|:------:|
| Endpoints authz per roles | ✅ (portal audits PASS 2026-07-24) |
| Admin sidebar CRUD modules | ✅ |
| Officer loop: detect → review → fine → notify | ✅ |
| Driver loop: notify → evidence → pay/appeal | ✅ |
| Mock AI + real weights same API contract | ✅ |
| Khmer + English toggle | ✅ |
| `docker compose` stack incl. both frontends | ✅ (2026-07-25: `frontend-user` / `frontend-admin`) |
| Backend tests cover acceptance paths | ✅ |
| Docs match implementation | 🔄 keep regenerating on material changes |

Portal verify scripts: `scripts/audit_*_portal_apis.py`, `scripts/verify_real_data.py`, `npm run verify:phase1`.

---

## Path mapping (prompt → repo)

| Prompt path | Actual path |
|-------------|-------------|
| `backend/` | `src/backend/` |
| `frontend-admin/` | `src/web/admin/` |
| `frontend-user/` | `src/web/user/` |
| `infra/docker/` | `infra/docker/` (+ prod under `infrastructure/deploy/docker/`) |
| `AI_MOCK_MODE` | `AI_USE_MOCK` |

---

## How to continue

1. Prefer **gap closure** over rebuild.
2. Local full stack: copy `.env.docker.example` → `.env.docker`, then `docker compose --env-file .env.docker up -d --build`.
3. Dev without Docker: `npm run setup:env` → backend `runserver` → `npm run dev`.
4. Next work should be ticketed gaps only (e.g. live RTSP cameras, email provider keys, SCHEMA regen after migrations).
