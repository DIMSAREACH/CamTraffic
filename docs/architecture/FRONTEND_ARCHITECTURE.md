# 3. Frontend Architecture — CamTraffic

Dual-portal React application: **Admin** (`:5174`) and **User** (`:5173` for police + drivers).

Built with **React 18 · TypeScript · Vite · Tailwind CSS 4 · Axios · React Router 6**.

---

## 3.1 High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (Client-Side SPA)                    │
├────────────────────────────┬────────────────────────────────────┤
│     frontend-admin         │         frontend-user               │
│     Role: admin            │   Role: police | driver             │
│     Port: 5174             │   Port: 5173                        │
├────────────────────────────┴────────────────────────────────────┤
│                         shared/ (mirrored)                       │
│  pages · components · hooks · services · i18n · styles           │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Axios → /api (Vite proxy in dev)
                                ▼
                       Django REST API (:8000)
```

**State management:** React Context (`AuthContext`, `LanguageContext`) — no Redux.

---

## 3.2 Portal Comparison

| Aspect | frontend-admin | frontend-user |
| --- | --- | --- |
| URL (dev) | http://localhost:5174 | http://localhost:5173 |
| Login roles | `admin` only | `police` or `driver` (tab select) |
| Layout | `admin/layout/AdminLayout` | `user/layout/` |
| Dashboard | `AdminDashboard` | `DriverDashboard` / `PoliceDashboard` |
| Unique features | User mgmt, full analytics | OAuth login, self-register |
| Shared pages | AI Detection, Violations, Fines, Cameras, Signs, Reports, AI Logs | Same set (role-gated) |

---

## 3.3 Directory Pattern

Each portal follows the same structure:

```text
frontend-{portal}/
├── App.tsx                 # Root + providers
├── routes.tsx              # React Router config
├── vite.config.ts          # Dev server + API proxy
│
├── {portal}/               # Portal-specific shell
│   ├── layout/             # Sidebar, navbar, auth layout
│   └── pages/              # Portal-only pages (dashboard home)
│
└── shared/                 # ★ Shared feature code
    ├── pages/              # Route-level pages
    ├── components/
    │   ├── ai/             # Detection pipeline UI
    │   ├── ui/             # Design system (shadcn-style)
    │   ├── signs/
    │   └── layout/
    ├── hooks/
    ├── context/
    ├── services/
    ├── i18n/
    ├── utils/
    ├── types/
    ├── styles/
    └── data/               # Static JSON (catalog, meta)
```

**Convention:** Bug fixes in AI/sign pages should be applied to **both** portals' `shared/` trees (they are duplicated, not a npm package).

---

## 3.4 Routing Architecture

`routes.tsx` defines protected routes with role guards:

```text
Public
  /login, /register, /forgot-password, /reset-password
  /auth/oauth/callback

Protected (requires JWT in localStorage)
  /dashboard          → role-specific home
  /ai-detection       → live webcam + upload pipeline
  /violations         → list, create, confirm/reject
  /fines              → issue, status, PDF
  /cameras            → CRUD + snapshot poll
  /traffic-signs      → catalog CRUD (admin)
  /ai-logs            → detection history + CSV
  /reports            → charts + PDF/Excel export
  /evidence           → archive search
  /profile            → edit profile + preferences
  /notifications      → alert inbox
  /users              → admin only
```

**Guard:** `AuthContext` + `PortalRedirect` — wrong role → logout message.

---

## 3.5 API Client Layer

```text
shared/services/
├── axiosClient.ts      # Base Axios instance, interceptors
└── api.ts              # Typed API functions per domain
```

### Axios interceptors

| Interceptor | Behavior |
| --- | --- |
| Request | Attach `Authorization: Bearer <access>` from `authStorage` |
| Response (401) | Attempt token refresh → retry or redirect login |
| Error | Map to user-friendly messages (`loginErrors.ts`) |

### Dev proxy (`vite.config.ts`)

```text
/api/*  →  http://127.0.0.1:8000/api/*
```

`VITE_API_URL=/api` in `.env`

---

## 3.6 AI Detection UI Architecture

The most complex frontend subsystem — `AIDetectionPage.tsx` + components:

```text
AIDetectionPage
├── PipelineInputPanel          # Upload vs webcam tabs
├── DetectionPipelineFlow       # Step indicator (sign→vehicle→OCR→violation)
├── LiveWebcamPanel             # getUserMedia stream
├── useWebcamDetection.ts       # Frame loop, 5-frame vote, processing lock
├── PipelineStepResultView      # Per-step results
├── DetectionDisplayImage       # Analyzed thumbnail + bbox overlay
└── DemoObservedActionSelect    # Demo violation action preset
```

### Webcam detection flow (client)

```text
getUserMedia → canvas capture → blob JPEG
      ↓
POST /api/ai/detect/ (live_scan: true)
      ↓
5-frame vote gate (STABLE_MIN_CONF=50)
      ↓
Overlay bounding boxes on video
      ↓
Update result panel (Khmer + EN labels)
```

**Key utils:** `yoloSignLabels.ts`, `detectionPipelineFlow.ts`, `webcamCaptureEnhance.ts`

---

## 3.7 Internationalization (i18n)

```text
shared/i18n/
├── translations.ts     # ~2500 lines EN + KM strings
├── translate.ts        # t() helper
└── LanguageContext.tsx # Locale state + persistence
```

All user-facing strings in violations, fines, AI detection, and dashboards are bilingual.

---

## 3.8 Styling Architecture

| File | Purpose |
| --- | --- |
| `styles/tailwind.css` | Tailwind 4 entry |
| `styles/theme.css` | CSS variables (light/dark) |
| `styles/dashboard.css` | Layout, cards, charts |
| `styles/auth.css` | Login/register pages |
| `styles/portal-theme.css` | Portal-specific accents |

**Component library:** shadcn/ui-style primitives in `components/ui/` (Button, Dialog, Table, etc.)

**Charts:** Recharts on dashboard and reports pages.

---

## 3.9 Auth State

```text
AuthContext
├── user: { id, email, full_name, role, profile_image }
├── login(email, password, expectedRole)
├── logout() → POST /api/auth/logout/ + clear storage
├── refreshToken()
└── isAuthenticated

authStorage.ts → localStorage keys for access/refresh tokens
```

Separate sessions per portal — admin and user logins do not share tokens.

---

## 3.10 Build & Dev Workflow

Root `package.json` scripts:

```bash
npm run dev              # Both portals concurrently
npm run dev:admin        # Admin only
npm run dev:user         # User only
npm run build            # Production build both
npm run install:frontends
```

### Production build output

```text
frontend-admin/dist/   → served by Nginx
frontend-user/dist/    → served by Nginx
```

---

## 3.11 Target Frontend Architecture (Docker)

```text
Nginx
├── admin.camtraffic.kh  → frontend-admin/dist/
├── app.camtraffic.kh    → frontend-user/dist/
└── /api/                → proxy to backend:8000
```

**Optional future:**

- PWA service worker for officer mobile alerts
- WebSocket client for real-time notifications (replace polling)
- Shared npm package `@camtraffic/shared` to deduplicate `shared/` folders

---

## 3.12 Page → API Mapping

| Page | Primary APIs |
| --- | --- |
| `AIDetectionPage` | `POST /api/ai/detect/`, `GET /api/ai/stats/` |
| `ViolationsPage` | `/api/violations/`, `/api/violations/evaluate/` |
| `FineManagement` | `/api/fines/`, `/api/fines/{id}/pdf/` |
| `CamerasPage` | `/api/cameras/`, `/api/roads/` |
| `AILogsPage` | `/api/ai/logs/`, `/api/ai/logs/export/` |
| `ReportsPage` | `/api/dashboard/admin/`, PDF + Excel endpoints |
| `AdminDashboard` | `/api/dashboard/admin/` |
| `DriverDashboard` | `/api/dashboard/driver/` |
| `ProfilePage` | `/api/auth/profile/`, `/api/auth/profile/preferences/` |

---

## 3.13 Planned UI Modules 📋

| Module | Pages / components | Phase |
| --- | --- | --- |
| KYC upload | `KYCVerificationPage` | Phase 4 |
| Unknown vehicle queue | `UnknownVehiclesPage` | Phase 7 |
| Payment receipt | `FinePaymentDialog` | Phase 8 |
| Appeals | `AppealsPage`, `AppealReviewPage` | Phase 9 |
| Camera health | `CameraHealthDashboard` | Phase 5 |
| AI model admin | `ModelVersionsPage` | Phase 12 |

---

## Related

- [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md)
- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)
- [SYSTEM_FLOW.md](../../SYSTEM_FLOW.md)
- [API_SPEC.md](../../API_SPEC.md)
