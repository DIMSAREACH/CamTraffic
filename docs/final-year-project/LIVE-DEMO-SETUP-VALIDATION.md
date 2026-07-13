# Live Demo Setup Validation

**Task 408** · CamTraffic Final Year Project  
**Date:** 2026-07-12 · **Purpose:** Pre-defense environment verification

---

## 1. Validation summary

| Category | Status | Notes |
|----------|:------:|-------|
| Backend health | ⬜ Run checklist | `/health/ready/` |
| Frontend portals | ⬜ Run checklist | Ports 5173, 5174 |
| AI inference | ⬜ Run checklist | Real weights, not mock |
| Demo accounts | ⬜ Run checklist | 3 roles seeded |
| E2E tests | ✅ Documented | 4/4 PASS (2026-07-12) |
| Backup video | ⬜ Optional | `FINAL-DEMO-VIDEO-PACKAGE.md` |

**Sign-off:** Complete all ⬜ items 24 hours before defense.

---

## 2. Hardware & network

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| CPU | 4 cores | 8 cores (AI inference) |
| RAM | 8 GB | 16 GB |
| Storage | 5 GB free | SSD |
| Display | 1920×1080 | HDMI to projector tested |
| Internet | Optional (OAuth/email) | Offline demo works without |
| Webcam | Optional | USB webcam for Scene 3 |

---

## 3. Software prerequisites

```bash
# Verify versions
python --version    # 3.11+
node --version      # 20+
cd backend && python manage.py --version
```

| Component | Path / command |
|-----------|----------------|
| Backend venv | `backend/venv/` activated |
| Dependencies | `pip install -r backend/requirements.txt` |
| Frontends | `npm run install:frontends` |
| AI weights | `ai/weights/best_v2.pt` (must exist) |
| Database | Migrated SQLite or PostgreSQL |

---

## 4. Environment configuration

### backend/.env

```env
SECRET_KEY=<set>
USE_SQLITE=True
AI_USE_MOCK=False
AI_MODEL_PATH=../ai/weights/best_v2.pt
AI_DETECTION_MODE=local
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

### frontend-admin/.env & frontend-user/.env

```env
VITE_API_URL=/api
VITE_API_PROXY_TARGET=http://127.0.0.1:8000
```

---

## 5. Startup sequence

**Terminal 1 — Backend:**
```bash
cd backend
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

**Terminal 2 — Frontends (from repo root):**
```bash
npm run dev
```

**Verify URLs:**

| Service | URL | Expected |
|---------|-----|----------|
| Backend health | http://127.0.0.1:8000/health/ | 200 OK |
| Admin portal | http://localhost:5174 | Login page |
| User portal | http://localhost:5173 | Officer/Driver tabs |
| API proxy | http://localhost:5174/api/health/ | 200 via Vite proxy |

---

## Demo account validation

Run once: `npm run seed:demo`

| Role | Portal | Tab | Email |
|------|--------|-----|-------|
| Admin | :5174 | — | admin@camtraffic.demo |
| Police | :5173 | Officer | officer@camtraffic.demo |
| Driver | :5173 | Driver | driver@camtraffic.demo |

Password for all: see `docs/final-year-project/DEMO-ACCOUNTS.md`

```bash
cd backend
python manage.py test tests.api.test_health_auth_users -v 2
```

---

## 7. AI pipeline validation

```bash
# Quick detect test (requires test image)
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"<police-email>","password":"<password>"}'

# Use token + multipart image on /api/ai/detect/
```

**Manual UI test:**
1. Officer portal → AI Detection
2. Upload image with visible stop or no-entry sign
3. Confirm class label + confidence > 0.5

**Expected:** Not mock data; real bounding boxes returned.

---

## 8. Demo scene dry-run checklist

| Scene | Validated | Time | Notes |
|-------|:---------:|------|-------|
| 1 Admin dashboard | ⬜ | 1 min | KPIs populate |
| 2 Camera grid | ⬜ | 2 min | Frames refresh |
| 3 AI detection | ⬜ | 2 min | Upload works |
| 4 Violation create | ⬜ | 2 min | Notification fires |
| 5 Officer fine | ⬜ | 2 min | PDF generates |
| 6 Driver portal | ⬜ | 2 min | Fine visible |
| 7 Reports export | ⬜ | 1 min | PDF downloads |

**Total dry-run target:** ≤ 15 minutes including transitions.

---

## 9. Automated validation commands

```bash
# From repo root — run day before defense
npm run validate:structure
npm run test:backend:phase12
npm run test:e2e
npm run benchmark:health   # optional, backend must be running
```

---

## 10. Backup plan

| Failure | Backup |
|---------|--------|
| Live demo crash | Pre-recorded video (`FINAL-DEMO-VIDEO-PACKAGE.md`) |
| AI inference fails | Set slides 9–10 + screenshots from `ai/runs/` |
| Projector HDMI issue | Share screen from laptop only |
| Network down | Offline SQLite demo (no OAuth/email) |
| Database corrupt | Restore admin backup ZIP |

---

## 11. Defense day kit

- [ ] Laptop charged + charger
- [ ] HDMI/USB-C adapter tested
- [ ] Demo script printed (`DEMO-SCRIPT.md`)
- [ ] Backup video on USB
- [ ] `CAMTRAFFIC-FINAL-PRESENTATION.pptx` on laptop
- [ ] Terminal windows pre-positioned (optional)
- [ ] Phone on silent

---

## 12. Sign-off log

| Validator | Date | Pass | Signature |
|-----------|------|:----:|-----------|
| Student dry-run 1 | | ⬜ | |
| Student dry-run 2 | | ⬜ | |
| Supervisor preview | | ⬜ | |

---

*Complete this validation before Phase 16 mock defenses (Tasks 411–413).*
