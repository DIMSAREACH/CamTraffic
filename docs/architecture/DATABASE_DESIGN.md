# 4. Database Design Overview — CamTraffic

High-level database design for the traffic enforcement platform. For column-level detail see [DATABASE_SCHEMA.md](../../DATABASE_SCHEMA.md) and [docs/ERD.md](../ERD.md).

> **Engine:** PostgreSQL 16 (production) · SQLite (local dev)  
> **ORM:** Django migrations in `backend/*/migrations/`  
> **PK strategy:** BIGINT today · UUID in thesis PRD (optional migration)

---

## 4.1 Design Principles

| Principle | Implementation |
| --- | --- |
| **Enforcement-first** | Schema follows camera → violation → fine lifecycle, not CRUD-only |
| **Human-in-the-loop** | Violations require officer review before fines; low-confidence AI routes to queue |
| **Auditability** | Planned `audit_logs` with JSONB old/new values + IP |
| **RBAC** | Users scoped by role; extended permission tables for admin granularity |
| **Evidence integrity** | Violation records store image paths + bbox JSON; fines link 1:1 to violations |
| **Localization** | Bilingual sign catalog; province lookup on plates |

---

## 4.2 Domain Model (6 Domains)

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. IDENTITY & SECURITY                                          │
│    users · drivers · officers · rbac_* · user_preferences       │
├─────────────────────────────────────────────────────────────────┤
│ 2. REGISTRY                                                     │
│    vehicles · (kyc documents — planned)                         │
├─────────────────────────────────────────────────────────────────┤
│ 3. INFRASTRUCTURE                                               │
│    roads · cameras · traffic_signals                            │
├─────────────────────────────────────────────────────────────────┤
│ 4. TRAFFIC KNOWLEDGE                                            │
│    traffic_signs · violation_rules (expert system KB)           │
├─────────────────────────────────────────────────────────────────┤
│ 5. ENFORCEMENT                                                  │
│    ai_detection_logs · traffic_violations · fines               │
│    unknown_vehicles · violation_appeals (planned)               │
├─────────────────────────────────────────────────────────────────┤
│ 6. OPERATIONS                                                   │
│    notifications · audit_logs · ai_model_versions (planned)     │
│    vehicle_tracking_logs                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4.3 Entity Relationship (Core)

```text
                    ┌─────────────┐
                    │ traffic_signs│ (knowledge base — no FK)
                    └──────┬──────┘
                           │ logical: sign_class_key
                    ┌──────▼──────┐
                    │violation_rules│
                    └──────┬──────┘
                           │
┌──────┐  detect   ┌───────▼────────┐  evaluate  ┌──────────────────┐
│ User │──────────►│ ai_detection_log│──────────►│ traffic_violation │
└──┬───┘           └────────────────┘            └────────┬─────────┘
   │ owns                                                  │ 1:1
   ▼                                                       ▼
┌─────────┐                                          ┌─────────┐
│ Vehicle │◄──────── plate match ────────────────────│  Fine   │
└─────────┘                                          └─────────┘
   ▲
   │ on road
┌──┴───┐    ┌────────┐
│ Road │───►│ Camera │
└──────┘    └────────┘
```

---

## 4.4 Table Groups

### Group A — Identity & RBAC ✅

| Table | Rows describe | Key relationships |
| --- | --- | --- |
| `users` | Login accounts (admin/police/driver) | 1:1 Driver or Officer profile |
| `drivers` | Verified citizen profile | 1:N vehicles, violations |
| `officers` | Police badge, rank, department | 1:N violations recorded |
| `rbac_roles` | Named roles | N:M permissions |
| `rbac_permissions` | Resource + action | — |
| `rbac_role_permissions` | Junction | — |
| `rbac_user_roles` | User ↔ role | — |
| `user_preferences` | Notification toggles | 1:1 user |

**Status:** ✅ Implemented · KYC fields on `drivers` pending

---

### Group B — Vehicle Registry ⚠️

| Table | Rows describe | Key relationships |
| --- | --- | --- |
| `vehicles` | Registered plates, type, color | N:1 owner (user), optional driver |

**Planned fields:** `registration_photo`, `registration_expiry`, `chassis_no`, `engine_no`, verification status

**Status:** ⚠️ Core CRUD done · document storage pending

---

### Group C — Infrastructure ⚠️

| Table | Rows describe | Key relationships |
| --- | --- | --- |
| `roads` | Road segments, speed limits | 1:N cameras, violations |
| `cameras` | Camera units, stream URLs, geo | N:1 road, 1:N violations |
| `traffic_signals` | Signal timing at intersections | N:1 road |

**Planned fields on `cameras`:** `last_ping`, `detection_count_today`, `resolution`

**Status:** ⚠️ CRUD done · telemetry pending

---

### Group D — Traffic Knowledge ✅

| Table | Rows describe | Key relationships |
| --- | --- | --- |
| `traffic_signs` | 10-class (+ legacy) bilingual catalog | Logical link to rules |
| `violation_rules` | Sign + action → violation type + fine amount | No FK — uses `sign_class_key` |

**Example rule:**

```text
sign_class_key: NO_LEFT_TURN
prohibited_action: TURN_LEFT
violation_type: ILLEGAL_LEFT_TURN
default_fine_amount: 40000
```

**Status:** ✅ Implemented

---

### Group E — Enforcement Core ⚠️

| Table | Rows describe | Key relationships |
| --- | --- | --- |
| `ai_detection_logs` | Every AI session (image, sign, plate, vehicles JSON) | N:1 user |
| `vehicle_tracking_logs` | ByteTrack IDs per live session | N:1 detection log |
| `traffic_violations` | Confirmed infractions + evidence | N:1 driver, vehicle, camera; 1:1 fine |
| `fines` | Monetary penalties | 1:1 violation, N:1 driver/police |
| `unknown_vehicles` | Unmatched plate queue | N:1 camera · 📋 planned |
| `violation_appeals` | Citizen disputes | N:1 violation · 📋 planned |

**Violation status workflow:**

```text
draft → pending_review → confirmed | rejected
                              ↓
                         fine issued
```

**Fine status workflow:**

```text
pending → paid | overdue | dismissed | disputed (planned)
```

**Status:** ⚠️ Core tables done · unknown + appeals pending

---

### Group F — Operations ⚠️

| Table | Rows describe | Status |
| --- | --- | --- |
| `notifications` | In-app alerts | ✅ |
| `audit_logs` | Immutable admin/officer action trail | 📋 |
| `ai_model_versions` | YOLO weight history + metrics | 📋 |
| `login_events` | Login audit (partial) | ✅ |

---

## 4.5 Data Flow by Enforcement Phase

| System flow phase | Primary tables written |
| --- | --- |
| Citizen registration | `users`, `drivers` |
| Vehicle registration | `vehicles` |
| Camera setup | `roads`, `cameras` |
| AI detection | `ai_detection_logs`, `vehicle_tracking_logs` |
| Violation processing | `traffic_violations` |
| Unknown plate | `unknown_vehicles` (planned) |
| Officer review | `traffic_violations.status` update |
| Fine generation | `fines` |
| Notification | `notifications` |
| Payment | `fines` payment fields (planned) |
| Appeal | `violation_appeals`, `fines.status` (planned) |

---

## 4.6 Indexing Strategy

| Table | Index | Purpose |
| --- | --- | --- |
| `users` | `email` UNIQUE | Login lookup |
| `users` | `(role, is_active)` | Admin user lists |
| `vehicles` | `plate_number` UNIQUE | OCR → vehicle match |
| `drivers` | `license_no` UNIQUE | Officer driver search |
| `fines` | `(status, created_at)` | Dashboard aggregations |
| `fines` | `(driver_id, status)` | Citizen fine list |
| `notifications` | `(user_id, is_read)` | Unread count |
| `traffic_violations` | `(status, violation_date)` | Pending review queue |
| `audit_logs` | `(user_id, timestamp)` | Planned audit queries |

---

## 4.7 PostgreSQL vs SQLite

| Aspect | Development | Production |
| --- | --- | --- |
| Engine | SQLite (`USE_SQLITE=True`) | PostgreSQL 16 |
| JSON fields | JSON | JSONB (preferred) |
| Concurrent writes | Limited | Full ACID |
| Spatial (future) | — | PostGIS extension optional |

**Migration path:** Same Django migrations; switch via `backend/.env`.

---

## 4.8 Docker Database Layout 📋

```text
docker-compose service: postgres
  image: postgres:16-alpine
  volumes: pgdata:/var/lib/postgresql/data
  env: POSTGRES_DB=camtraffic_db

docker-compose service: redis
  image: redis:7-alpine
  volumes: redisdata:/data
  use: cache + Celery broker (not primary data store)
```

---

## 4.9 Planned Schema Additions

| Table | Trigger | Priority |
| --- | --- | --- |
| `unknown_vehicles` | OCR plate not in registry OR conf < 75% | P1 |
| `violation_appeals` | Citizen disputes fine | P1 |
| `audit_logs` | Any admin/officer state change | P2 |
| `ai_model_versions` | Admin deploys new YOLO weights | P2 |
| KYC fields on `drivers` | Citizen registration flow | P2 |
| Payment fields on `fines` | Receipt upload flow | P1 |

---

## 4.10 Implementation vs PRD Spec

| PRD spec | Current Django | Gap |
| --- | --- | --- |
| UUID primary keys | BIGINT auto-increment | Optional migration |
| `license_plate` | `plate_number` | Naming only |
| `stream_url` | `frame_source_url` | Naming only |
| `violation_appeals` | Not created | Full module needed |
| `unknown_vehicles` | Not created | Full module needed |
| `audit_logs` | Not created | Middleware + model |

---

## Related

- [DATABASE_SCHEMA.md](../../DATABASE_SCHEMA.md) — column definitions
- [docs/ERD.md](../ERD.md) — Mermaid ER diagrams
- [docs/SCHEMA.sql](../SCHEMA.sql) — partial SQL DDL
- [SYSTEM_FLOW.md](../../SYSTEM_FLOW.md) — flow → table mapping
