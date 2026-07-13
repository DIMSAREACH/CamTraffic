# Chapter 5 — Implementation [DRAFT]

**Task 386** · CamTraffic Final Year Project · 2026

---

## 5.1 Backend Implementation

Django 5 project `camtraffic` with 16 apps mounted under `/api/` via `camtraffic/api_urls.py`.

| App | Responsibility |
|-----|----------------|
| authentication | JWT, OAuth, email verify |
| users | User, Officer, Driver profiles |
| rbac | Roles and permissions |
| ai_detection | Detect, OCR, pipeline |
| violations | Rules and violation records |
| fines | Fine CRUD, PDF export |
| appeals | Driver appeals workflow |
| infrastructure | Roads, cameras |
| dashboard | KPIs, backup, reports |

**Key file:** `backend/ai_detection/pipeline_enforcement.py` — orchestrates YOLO inference, plate OCR, and violation rule matching.

Production settings: `camtraffic/settings_production.py` with JSON logging.

---

## 5.2 Frontend Implementation

| Portal | Stack | Port (dev) |
|--------|-------|------------|
| frontend-admin | React 19, Vite, Tailwind | 5174 |
| frontend-user | React 19, Vite, Tailwind | 5173 |

Shared code in `shared/` (components, services, i18n). API client: `shared/services/api.ts` with JWT refresh interceptor.

Role routing: admin → `/admin/*`; police/driver → `/dashboard/*` with Officer/Driver login tabs.

---

## 5.3 AI Pipeline Implementation

1. Image received (multipart upload or base64 frame)  
2. Ultralytics YOLO loads `ai/weights/best_v2.pt`  
3. Sign detections returned with class key and confidence  
4. Vehicle bbox + EasyOCR plate read (when visible)  
5. `evaluate_violation()` matches sign class to ViolationRule  
6. AIDetectionLog persisted; optional Violation + Fine creation  

Mock mode (`AI_USE_MOCK=True`) supports development without GPU.

---

## 5.4 User Interface Highlights

| Screen | Feature |
|--------|---------|
| Admin Dashboard | KPI widgets, 30s auto-refresh |
| AI Detection | Upload/webcam, bounding box overlay |
| Live Cameras | Grid with 5s frame refresh |
| Fines (driver) | Pay, PDF receipt, appeal link |
| Reports | PDF and Excel export |

*Screenshot placeholders: insert captures from admin dashboard, detection result, fine PDF during final Word export.*

---

## 5.5 Implementation Challenges

| Challenge | Solution |
|-----------|----------|
| Windows Celery | `--pool=solo` worker flag |
| Docker on Windows paths | Quoted compose wrapper in bash scripts |
| Cross-platform node_modules | `.dockerignore` + `npm ci` in nginx image |
| Plate OCR accuracy | Documented as limitation; post-process normalization |

---

*Draft version — see `CHAPTER-5-IMPLEMENTATION-FINAL.md` for submission copy.*
