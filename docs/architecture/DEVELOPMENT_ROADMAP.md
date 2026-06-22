# 5. Development Roadmap — CamTraffic

Structured roadmap from **current state (~53%)** to **production-ready deployment**, aligned with [SYSTEM_FLOW.md](../../SYSTEM_FLOW.md), [PLAN.md](../../PLAN.md), and [TASKS.md](../../TASKS.md).

> **Rule:** Do not skip the enforcement lifecycle order — build flows, not isolated CRUD screens.

---

## 5.1 Executive Summary

| Milestone | Target | Status |
| --- | --- | --- |
| Thesis defense prototype | E2E detect → violation → fine | ✅ Ready |
| Field pilot (Phnom Penh cameras) | Ingest API + unknown queue | ❌ Not started |
| Public launch | Payment + appeals + Docker | ❌ Not started |
| Production hardening | Redis, Celery, audit, HTTPS | ❌ Not started |

---

## 5.2 Recommended Build Order

```text
Auth → Vehicle → Camera → AI Detection → Violation → Fine → Notification → Appeal → Dashboard → Deployment
```

This order minimizes risk: each sprint delivers a demoable increment before AI complexity.

---

## 5.3 Sprint Roadmap

### Sprint 1 — Identity & Registry ✅ DONE

**Goal:** Users can register, login, and manage vehicles.

| Task | Status | Notes |
| --- | --- | --- |
| JWT auth + refresh + blacklist | ✅ | |
| Admin / police / driver roles | ✅ | |
| User CRUD (admin) | ✅ | |
| Vehicle CRUD | ✅ | |
| Profile + photo upload | ✅ | |
| OAuth (Google/GitHub) | ✅ | User portal |
| KYC (National ID + license) | ❌ | **Next priority** |

**Exit criteria:** Citizen can login and register a vehicle with plate number.

---

### Sprint 2 — Infrastructure & Dashboards ⚠️ IN PROGRESS

**Goal:** Admin can configure roads/cameras; dashboards show live metrics.

| Task | Status | Notes |
| --- | --- | --- |
| Roads CRUD | ✅ | |
| Cameras CRUD + snapshot URL | ✅ | |
| Admin dashboard metrics | ✅ | |
| Police / driver dashboards | ✅ | |
| Camera heartbeat telemetry | ❌ | |
| RTSP / stream ingestion | ❌ | |
| Camera health dashboard | ❌ | |

**Exit criteria:** Admin adds a camera; police polls snapshot for AI detect.

---

### Sprint 3 — AI Core ✅ DONE

**Goal:** YOLO detects Cambodian signs, vehicles, and plates.

| Task | Status | Notes |
| --- | --- | --- |
| 10-class dataset + training | ✅ | `ai/dataset_10/` |
| YOLOv8 sign model deployed | ✅ | `best.pt` |
| Vehicle detection (COCO) | ✅ | |
| ByteTrack live IDs | ✅ | Webcam only |
| EasyOCR plate + province | ⚠️ | Latin plates |
| Gemini hybrid fallback | ✅ | Optional |
| mAP ≥ 92% formal benchmark | ❌ | TS-03 evaluation |
| Speed detection | ❌ | Camera calibration |

**Exit criteria:** Upload image → sign name + vehicle + plate in one API call.

---

### Sprint 4 — Enforcement Loop ⚠️ IN PROGRESS

**Goal:** Complete violation → review → fine → notify cycle.

| Task | Status | Notes |
| --- | --- | --- |
| Violation rule engine | ✅ | 9+ rules |
| Evidence capture (frame/crops) | ✅ | |
| Officer confirm/reject UI | ✅ | |
| Fine issuance + PDF | ✅ | |
| In-app notifications | ✅ | |
| Unknown vehicle queue | ❌ | **High priority** |
| Email / SMS notifications | ❌ | |

**Exit criteria:** Officer approves AI violation → fine created → driver notified in-app.

---

### Sprint 5 — Citizen Completion ❌ NOT STARTED

**Goal:** Citizens can pay fines and submit appeals.

| Task | Status | Notes |
| --- | --- | --- |
| Payment receipt upload | ❌ | |
| Officer payment verification | ❌ | |
| Appeal submit + review | ❌ | |
| Fine disputed status lock | ❌ | |
| Payment history view | ❌ | |

**Exit criteria:** Full lifecycle: violation → fine → pay OR appeal → case closed.

---

### Sprint 6 — Platform & Deployment ❌ NOT STARTED

**Goal:** Production-ready Docker stack with Redis and HTTPS.

| Task | Status | Notes |
| --- | --- | --- |
| Docker Compose (dev) | ❌ | |
| PostgreSQL + Redis containers | ❌ | |
| Celery workers | ❌ | PDF, email, ingest |
| Nginx reverse proxy | ❌ | |
| `/api/v1/` route prefix | ❌ | |
| CI/CD (GitHub Actions) | ❌ | |
| HTTPS + domain | ❌ | |
| Audit logs | ❌ | |

**Exit criteria:** `docker compose up` runs full stack; staging URL accessible.

---

## 5.4 Phase Alignment (TASKS.md)

| TASKS Phase | Sprint | Priority | Completion |
| --- | --- | --- | --- |
| 1 — Project Setup | Sprint 6 | Medium | 79% |
| 2 — Database | Sprint 1–5 | High | 67% |
| 3 — Auth | Sprint 1 | Done | 100% |
| 4 — Citizen/Driver | Sprint 1, 5 | High | 46% |
| 5 — Cameras | Sprint 2 | Medium | 50% |
| 6 — AI | Sprint 3 | Done | 50% |
| 7 — Violations | Sprint 4 | High | 64% |
| 8 — Fines | Sprint 4–5 | High | 55% |
| 9 — Appeals | Sprint 5 | High | 0% |
| 10 — Notifications | Sprint 4–5 | Medium | 29% |
| 11 — Dashboard | Sprint 2 | Medium | 67% |
| 12 — AI Admin | Sprint 6 | Low | 0% |
| 13 — Security | Sprint 6 | High | 33% |
| 14 — Reports | Sprint 4 | Low | 60% |
| 15 — Deployment | Sprint 6 | High | 11% |
| 16 — Testing | Ongoing | High | 40% |

---

## 5.5 12-Month Plan Alignment (PLAN.md)

| PLAN Phase | Months | Maps to sprints | Status |
| --- | --- | --- | --- |
| Foundation & Data | 1–3 | Sprint 1–3 | ⚠️ 75% |
| Core Development | 4–7 | Sprint 3–4 | ⚠️ 60% |
| Pilot & Field Testing | 8–9 | Sprint 4–5 + ingest | ❌ 15% |
| Scale & Launch | 10–12 | Sprint 5–6 | ❌ 5% |

---

## 5.6 Immediate Next Steps (No Code Yet — Planning Only)

Priority order for **next implementation sprint**:

| # | Item | Why | Docs |
| --- | --- | --- | --- |
| 1 | **Unknown vehicle queue** | PRD requires no auto-fine on unmatched plates | SYSTEM_FLOW Phase 6 |
| 2 | **KYC upload flow** | Citizen registration incomplete per PRD | SYSTEM_FLOW Phase 1 |
| 3 | **Payment receipt workflow** | Closes enforcement loop | SYSTEM_FLOW Phase 10 |
| 4 | **Appeals module** | Legal requirement for citizen trust | SYSTEM_FLOW Phase 11 |
| 5 | **Docker Compose stack** | Unblocks Redis, Celery, prod parity | PLAN §3 |
| 6 | **Camera ingest API** | Field pilot prerequisite | API_SPEC §7.1 |
| 7 | **Audit logs** | Security + thesis compliance | PRD §5.2 |

---

## 5.7 Thesis Defense Track (Parallel)

Independent of production roadmap — deadline-driven:

| Week | Focus | Deliverable | Status |
| --- | --- | --- | --- |
| W-4 | Live webcam accuracy | Phase G threshold fixes | ⚠️ |
| W-3 | E2E demo rehearsal | DEMO_SCRIPT.md green | ⚠️ |
| W-2 | Thesis Ch 4–5 polish | Screenshots + results tables | ⚠️ |
| W-1 | Q&A prep | Phase E deflection matrix | ❌ |
| Defense | Live demo | Upload + webcam + violation + fine | ✅ Path exists |

---

## 5.8 Quality Gates

Before each milestone, verify:

| Gate | Command / action |
| --- | --- |
| API tests pass | `python manage.py test` |
| E2E pipeline | `python manage.py test tests.test_e2e_pipeline` |
| AI audit | `python scripts/audit_detection_pipeline.py` |
| Live demo | Run [DEMO_SCRIPT.md](../../DEMO_SCRIPT.md) |
| No secrets in git | `.env` gitignored |

### Production gate (before public launch)

- [ ] Load test ingest API (Locust/JMeter)
- [ ] Penetration test JWT + RBAC
- [ ] mAP ≥ 92% on validation set
- [ ] Human-in-the-loop enforced (no auto-fine below 75% conf)
- [ ] HTTPS + audit logs operational
- [ ] Officer training SOP documented

---

## 5.9 Risk-Adjusted Sequencing

Per [PLAN.md](../../PLAN.md) risk matrix — prioritize safety over speed:

```text
1. False-positive prevention  → unknown queue + officer review (before auto-fine scale)
2. Data privacy               → RBAC + HTTPS + log masking (before public launch)
3. Network resilience         → edge buffer + retry ingest (before field pilot)
4. Audit trail                → audit_logs (before multi-officer production use)
```

---

## 5.10 Success Metrics

| Metric | Target | Current |
| --- | --- | --- |
| Overall TASKS completion | 100% | ~53% |
| Sign detection mAP@0.5 | ≥ 92% | Evaluation pending |
| API test pass rate | 100% critical paths | ✅ |
| E2E demo reliability | 3/3 runs green | ⚠️ |
| Enforcement flow complete | Payment + appeals | ❌ |
| Docker one-command deploy | `docker compose up` | ❌ |

---

## Related

- [TASKS.md](../../TASKS.md) — detailed checkboxes
- [PLAN.md](../../PLAN.md) — 12-month rollout + QA
- [SYSTEM_FLOW.md](../../SYSTEM_FLOW.md) — flow phases
- [PRD.md](../../PRD.md) — requirements source
