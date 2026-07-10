# CamTraffic Test Suite

Quality assurance for Phase 8 (Tasks **113–120**).

| Suite | Path | Command | Task |
|-------|------|---------|------|
| Backend unit | `tests/backend/` | `npm run test:backend` | 113 |
| Frontend admin | `tests/frontend-admin/` | `npm run test:frontend` | 114 |
| Frontend user | `tests/frontend-user/` | `npm run test:frontend` | 115 |
| API | `tests/api/` | `npm run test:backend` | 116 |
| Integration | `tests/integration/` | `npm run test:backend` | 117 |
| E2E | `tests/e2e/` | `npm run test:e2e` | 118 |
| Performance | `tests/performance/` | `npm run test:performance` | 119 |
| Security | `tests/security/` | `npm run test:backend` | 120 |

## Quick start

```bash
# Python backend tests (uses SQLite in-memory via config.settings.testing)
pip install -r backend/requirements.dev.txt
npm run test:backend

# React component tests (Vitest + Testing Library)
npm install
npm run test:frontend

# End-to-end smoke tests (Playwright; reuses running dev servers when available)
npx playwright install chromium   # one-time, also runs via npm run test:e2e
npm run test:e2e

# Health endpoint benchmark (requires running backend)
npm run test:performance
```

## Configuration

| File | Purpose |
|------|---------|
| `pytest.ini` | Django/pytest discovery and settings module |
| `tests/conftest.py` | Shared API client and user fixtures |
| `tests/vitest.config.ts` | Frontend test runner and package aliases |
| `tests/e2e/playwright.config.ts` | Browser projects for admin and user portals |
| `backend/config/settings/testing.py` | Fast isolated Django settings |

## Environment variables

| Variable | Default | Used by |
|----------|---------|---------|
| `CAMTRAFFIC_BASE_URL` | `http://localhost:8000` | Performance benchmark |
| `CAMTRAFFIC_ADMIN_URL` | `http://localhost:5173` | Playwright admin project |
| `CAMTRAFFIC_USER_URL` | `http://localhost:5174` | Playwright user project |
| `CAMTRAFFIC_PERF_ITERATIONS` | `30` | Performance benchmark |
| `CAMTRAFFIC_PERF_P95_MS` | `250` | Performance p95 threshold |
