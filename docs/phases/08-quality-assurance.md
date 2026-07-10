# Phase 8 — Quality Assurance

Tasks **113–120** — **Complete**

See [tests/README.md](../../tests/README.md).

| Task | Name | Folder | Runner |
|------|------|--------|--------|
| 113 | Backend Unit Testing | `tests/backend/` | pytest |
| 114 | Frontend Admin Testing | `tests/frontend-admin/` | Vitest |
| 115 | Frontend User Testing | `tests/frontend-user/` | Vitest |
| 116 | API Testing | `tests/api/` | pytest + DRF client |
| 117 | Integration Testing | `tests/integration/` | pytest |
| 118 | End-to-End Testing | `tests/e2e/` | Playwright |
| 119 | Performance Testing | `tests/performance/` | Node benchmark |
| 120 | Security Testing | `tests/security/` | pytest |

## Deliverables

- **113:** User model and monitoring unit tests
- **114:** Admin `RouteGuard` and `LoginForm` component tests
- **115:** User `RouteGuard`, `FinesTabs`, and portal constant tests
- **116:** Health, auth, and users API endpoint tests
- **117:** Login → profile → dashboard integration flow
- **118:** Admin and user portal login smoke specs
- **119:** `/health/` latency benchmark with p95 threshold
- **120:** Security headers, login rate limit, and RBAC authorization tests
