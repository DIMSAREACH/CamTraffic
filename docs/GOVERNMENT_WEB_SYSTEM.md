# CamTraffic — Real-World Government Web System (Cambodia)

**Thesis topic:** Design and Develop of an AI-Based Traffic Sign Detection and Traffic Law Enforcement System in Cambodia

**Scope:** Complete **web application** for Ministry / Traffic Police operations (not a mobile-first product).

---

## Government workflow (end-to-end)

```
Camera / Upload / Webcam
        ↓
AI: Traffic Sign Detection (YOLO)
        ↓
AI: Vehicle + License Plate OCR
        ↓
Expert rules → pending_review case
        ↓
Officer AI Review Queue  (/officer/detection-queue)
   ├─ Approve → fine issued (KHR display) + demerit points
   └─ Reject  → dismissed with reason
        ↓
Citizen pays (KHQR / bank) → awaiting_verification
        ↓
Officer verifies payment → paid
        ↓
Citizen may appeal → officer reviews appeal
```

This matches real Cambodian-style **human-in-the-loop** enforcement: AI assists detection; officers confirm legal liability.

---

## Web portals (100% web app)

| Portal | URL | Role | Core capabilities |
|--------|-----|------|-------------------|
| **Admin** | `/admin/*` | Ministry / system admin | AI Detection, cameras, users, RBAC, MLOps, reports, audit, settings, fines oversight |
| **Officer** | `/officer/*` | Traffic police | AI Detection, **AI Review Queue**, violations, fines, payment verify, appeals, evidence, drivers |
| **Citizen** | `/citizen/*` | Drivers | View violations/fines, KHQR pay, appeals, traffic rules, notifications — **no operational AI** |

---

## Modules aligned to the thesis topic

1. **AI Traffic Sign Detection** — Admin + Officer detection centers  
2. **Plate OCR / ANPR** — pipeline evidence snapshots  
3. **Traffic law enforcement** — violation rules + officer confirmation  
4. **Fines & payments** — KHR UI, KHQR proof, officer verification  
5. **Appeals** — citizen submit / officer review  
6. **Governance** — RBAC, audit logs, Cambodia branding  

### AI model (defense-consistent)

| Layer | Count | File / note |
|-------|------:|-------------|
| **Live runtime** | **248** | `ai/weights/best.pt` |
| Sign catalog (taxonomy) | **248** | `ai/sign_catalog.json` |
| Thesis eval metrics | **10** | `ai/weights/best_v2.pt` — mAP@50 = **0.908** (do not apply to 248) |

See [`docs/AI-MODEL-STORY.md`](AI-MODEL-STORY.md).

---

## Recent government-completeness upgrades

- Officer **Detection Review Queue** page (`/officer/detection-queue`)
- Cambodia-oriented fine schedule (USD storage → **KHR display**)
- **Demerit points** on rules + driver license record
- Payment status **`awaiting_verification`** + officer **verify payment** API/UI
- Honest policy banner: AI proposes; officer decides

---

## How to run the web system

```bash
# Backend
cd src/backend
venv\Scripts\activate
python manage.py migrate
python manage.py runserver

# Frontends (from repo root)
npm run dev:admin   # http://localhost:5174
npm run dev:user    # http://localhost:5173  → /officer or /citizen
```

Demo accounts (if seeded): see `npm run seed:demo`.

---

## Thesis defense talking points

1. System detects **Cambodian traffic signs** with YOLO (**248-class** live model `best.pt`; thesis mAP@50 = 0.908 is for the **10-class** eval subset).  
2. Enforcement is **government-realistic**: officer confirmation before fines.  
3. Citizens interact via self-service web portal (pay / appeal).  
4. Admin operates ministry oversight (models, cameras, audit).  
5. Currency UX is **KHR** for Cambodia; amounts follow illustrative Land Traffic Law schedule.

---

**Classification:** Official Use — Kingdom of Cambodia thesis project  
