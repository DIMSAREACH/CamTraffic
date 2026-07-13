# CamTraffic — User Manual

**Version:** 1.0 · **Date:** July 2026  
**Audience:** Administrators, traffic police, and drivers

Role-specific detail: [`final-year-project/manuals/`](./final-year-project/manuals/)

---

## 1. System overview

CamTraffic detects Cambodian traffic signs using AI, records violations, issues fines, and notifies drivers through web portals.

**Full workflow guide:** [SYSTEM-WORKFLOW.md](./SYSTEM-WORKFLOW.md) — admin setup, AI training, officer detection, driver payment/appeal, and database flow.

| Role | Portal | URL (dev) |
|------|--------|-----------|
| Administrator | Admin | http://localhost:5174 |
| Traffic police | User → Officer tab | http://localhost:5173 |
| Driver | User → Driver tab | http://localhost:5173 |

---

## 2. Getting started

1. Open the correct portal for your role.
2. Log in with email and password (or register as driver on user portal).
3. Use the sidebar to navigate modules.
4. Toggle **Khmer / English** from the language control in the header.

---

## 3. Administrator

| Task | Navigation |
|------|------------|
| Dashboard KPIs | Dashboard (auto-refresh 30s) |
| Manage users | Users |
| Cameras & roads | Cameras, Roads |
| Traffic sign catalog | Traffic Signs |
| AI detection test | AI Detection |
| Violations & fines | Violations, Fines |
| Reports PDF/Excel | Reports |
| System backup | System Settings / Backup |
| Audit trail | Audit Logs |
| RBAC roles | Roles |

**Live cameras:** Cameras page shows grid with 5s refresh; use **Run AI detect** on a snapshot.

---

## 4. Traffic police (officer)

| Task | Navigation |
|------|------------|
| Dashboard | Dashboard |
| Run detection | AI Detection (upload or webcam) |
| Review violations | Violations |
| Issue fines | Fines → create / confirm |
| Review appeals | Appeals |
| Evidence | Evidence Archive |
| Reports | Reports |

Enable **auto-create violation** on detection when testing enforcement flow.

---

## 5. Driver

| Task | Navigation |
|------|------------|
| Dashboard | Dashboard |
| My violations | Violations |
| My fines | Fines → Manage tab |
| Payment history | Fines → Payments tab |
| Submit appeal | Appeals |
| My vehicles | Vehicles |
| Notifications | Notifications bell |
| Profile & settings | Profile, Settings |

---

## 6. AI detection workflow

1. Upload a traffic scene image or use webcam.
2. Review detected sign class, confidence, Khmer/English labels.
3. Optional: vehicle bounding box + license plate OCR.
4. If violation rule matches → violation record created (when enabled).
5. Officer confirms → fine issued → driver notified.

---

## 7. Appeals

1. Driver opens **Appeals** → submit reason + linked fine.
2. Officer/Admin reviews → approve (dismiss/reduce) or reject.
3. Driver receives notification of outcome.

---

## 8. Support & docs

| Document | Purpose |
|----------|---------|
| [Admin Manual](./final-year-project/manuals/ADMIN-MANUAL.md) | Full admin procedures |
| [Officer Manual](./final-year-project/manuals/OFFICER-MANUAL.md) | Enforcement workflows |
| [Driver Manual](./final-year-project/manuals/DRIVER-MANUAL.md) | Citizen portal guide |
| [DEMO-SCRIPT](./final-year-project/DEMO-SCRIPT.md) | Defense demo steps |
