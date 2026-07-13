# Appendices

**Task 390** · CamTraffic Final Year Project

---

## Appendix A — API Endpoint Summary

Full catalog: `backend/docs/API.md` (~120 route handlers)

| Module | Prefix | Key endpoints |
|--------|--------|---------------|
| Auth | `/api/auth/` | login, register, profile, refresh |
| Users | `/api/users/` | CRUD, toggle-active, driver search |
| Officers | `/api/officers/` | officers, stations |
| Drivers | `/api/drivers/` | CRUD |
| RBAC | `/api/rbac/` | roles, permissions |
| Vehicles | `/api/vehicles/` | CRUD, search |
| Signs | `/api/signs/` | catalog, chatbot |
| Roads | `/api/roads/` | CRUD |
| Cameras | `/api/cameras/` | CRUD, live-status |
| AI | `/api/ai/` | detect, process-frame, logs |
| OCR | `/api/ocr/` | recognize, list |
| Violations | `/api/violations/` | CRUD, evaluate, rules |
| Fines | `/api/fines/` | CRUD, pay, pdf |
| Appeals | `/api/appeals/` | create, review |
| Dashboard | `/api/dashboard/` | admin/police/driver stats, backup |
| Notifications | `/api/notifications/` | list, mark read |
| Audit | `/api/audit/` | admin log |

---

## Appendix B — 10-Class Sign Taxonomy

Source: `ai/dataset_10/classes.txt`

| Class ID | Key | Category | Description |
|----------|-----|----------|-------------|
| 0 | NO_ENTRY | Regulatory | No entry for vehicles |
| 1 | NO_LEFT_TURN | Prohibitory | Left turn prohibited |
| 2 | NO_RIGHT_TURN | Prohibitory | Right turn prohibited |
| 3 | NO_U_TURN | Prohibitory | U-turn prohibited |
| 4 | NO_PARKING | Prohibitory | Parking prohibited |
| 5 | M_STOP | Mandatory | Stop required |
| 6 | P_SPEED_LIMIT_20_KM_H | Prohibitory | Maximum 20 km/h |
| 7 | P_SPEED_LIMIT_50_KM_H | Prohibitory | Maximum 50 km/h |
| 8 | W_PEDESTRIAN_CROSSING | Warning | Pedestrian crossing ahead |
| 9 | I_ONE_WAY_TRAFFIC | Information | One-way traffic direction |

Extended 31-class catalog documented in dataset build reports under `docs/reports/`.

---

## Appendix C — Sample Detection Output (JSON)

```json
{
  "success": true,
  "data": {
    "signs": [
      {
        "class_key": "NO_ENTRY",
        "confidence": 0.94,
        "bbox": [120, 80, 280, 240],
        "label_en": "No Entry",
        "label_km": "ហាមចូល"
      }
    ],
    "vehicles": [
      {
        "bbox": [400, 300, 620, 480],
        "plate_text": "2A-1234",
        "plate_confidence": 0.72
      }
    ],
    "violation": {
      "matched": true,
      "rule_id": "uuid-here",
      "violation_type": "illegal_entry"
    },
    "log_id": "uuid-here"
  }
}
```

---

## Appendix D — UAT Checklist Summary

| # | Scenario | Admin | Police | Driver |
|---|----------|:-----:|:------:|:------:|
| 1 | Login valid credentials | ✓ | ✓ | ✓ |
| 2 | Login invalid password | ✓ | ✓ | ✓ |
| 3 | Role portal restriction | ✓ | ✓ | ✓ |
| 4 | AI detection upload | ✓ | ✓ | — |
| 5 | View violations | ✓ | ✓ | ✓ |
| 6 | Issue fine | — | ✓ | — |
| 7 | Pay fine | — | — | ✓ |
| 8 | Submit appeal | — | — | ✓ |
| 9 | Review appeal | ✓ | ✓ | — |
| 10 | Export PDF report | ✓ | ✓ | — |

Full report: `docs/final-year-project/UAT-REPORT.md`

---

## Appendix E — Installation Quick Reference

```bash
# Backend
cd backend && pip install -r requirements.txt
python manage.py migrate && python manage.py runserver

# Frontends
npm run install:frontends && npm run dev

# Tests
npm run test:backend:phase12
npm run test:e2e

# Production
npm run docker:prod:up
```

Full guide: `docs/INSTALLATION-GUIDE.md`

---

## Appendix F — AI Training Results (Epoch 10)

| Metric | Value |
|--------|------:|
| mAP@50 | 0.908 |
| mAP@50-95 | 0.796 |
| Precision | 0.960 |
| Recall | 0.196 |

Artifact path: `ai/runs/detect/dataset_10_train/`

---

## Appendix G — Repository Structure (Abbreviated)

```
CamTraffic/
├── backend/          # Django API
├── frontend-admin/   # Admin SPA
├── frontend-user/    # User SPA
├── ai/               # YOLO training & weights
├── deploy/           # Docker production
├── packages/         # Shared TS packages
├── tests/            # E2E & integration
└── docs/             # Documentation
```

Full map: `docs/FOLDER-MAP.md`
