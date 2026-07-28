# CamTraffic — Architecture Decisions

Judgment calls made while implementing (and aligning) against the Master Build Prompt.
Date baseline: 2026-07-25.

---

## D1 — Repository layout uses `src/` monorepo (not root `backend/` / `frontend-*`)

**Prompt said:** `backend/`, `frontend-admin/`, `frontend-user/` at repo root.

**Chose:** `src/backend/`, `src/web/admin/`, `src/web/user/` (+ shared `packages/`).

**Why:** Existing monorepo already ships npm workspaces, Turborepo, and production Docker under this layout. Renaming would break CI, Docker contexts, and docs without functional gain. Logical modules still match the prompt (Django apps + two Vite portals).

---

## D2 — Mock AI flag is `AI_USE_MOCK` (not `AI_MOCK_MODE`)

**Prompt said:** `AI_MOCK_MODE`.

**Chose:** `AI_USE_MOCK` in Django settings / `.env` (already wired through pipeline, audits, production guards).

**Why:** Renaming would break deployed envs and audit scripts. Behavior matches the prompt: realistic fake detections without GPU/weights.

---

## D3 — Primary AI stays embedded in Django; optional vision containers exist

**Prompt said:** AI runtime embedded in Django — not a separate microservice.

**Chose:** Production path = `src/backend/ai_detection/` (YOLOv11 + EasyOCR). Compose may also start optional `ai-vision` / `ocr` / `ai-service` for thesis/experiments; they are **not** required for the officer/driver/admin loops.

**Why:** Matches O1–O2 and Section 9 while keeping optional remote-vision experiments without changing the `/api/ai/*` contract.

---

## D4 — Three portals: admin + user (officer|driver) + optional citizen PWA

**Prompt said:** Admin (5174) + User officer/driver (5173).

**Chose:** Same, plus `src/web/citizen` (Next.js) as an Enterprise v2 surface. Core acceptance loops use admin + user portals only.

---

## D5 — Roles: `admin` | `police` | `driver` (no supervisor)

**Chose:** As specified. Officer UI routes use `/officer/*`; API role value remains `police`.

---

## D6 — Payment gateway stub only

**Chose:** Manual / stub “mark paid” + ABA sandbox hooks where present; real PSP settlement remains out of scope per Section 11.

---

## D7 — Flutter mobile deferred

**Prompt Section 11:** native mobile out of scope.

**Chose:** Checklist Task008 (Flutter) stays incomplete on purpose. Responsive web only.

---

## D8 — Local Docker Compose includes SPA frontends (O8)

**Prompt O8:** postgres, redis, Django, Celery, both frontends.

**Chose:** Root `docker-compose.yml` serves `frontend-user` (:5173) and `frontend-admin` (:5174) via nginx static images that proxy `/api` and `/media` to `backend`. Production multi-domain nginx remains under `infrastructure/deploy/docker/`.

---

## D9 — UUID PKs + Postgres 16 / SQLite via `USE_SQLITE`

**Chose:** As specified. Production settings force `USE_SQLITE=False`.

---

## D10 — Sign catalog: train/runtime may exceed 10 classes

**Prompt:** 10-class Cambodian demo set, extensible via `TrafficSign`.

**Chose:** Keep 10-class dataset/docs for thesis metrics; DB catalog may hold a larger active set seeded for Cambodia. Violation rules still map `sign_class_key` → fine amounts in KHR.
