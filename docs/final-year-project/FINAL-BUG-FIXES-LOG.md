# Final Bug Fixes Log

**Task 416** · CamTraffic Final Year Project  
**Period:** Phase 12–17 · **Last updated:** 2026-07-12

---

## Summary

| Severity | Fixed | Open |
|----------|------:|-----:|
| Critical | 6 | 0 |
| High | 5 | 0 |
| Medium | 4 | 2 |
| Low | 3 | 3 |

**Release gate:** All critical and high bugs resolved for v1.0.0 thesis submission.

---

## Critical fixes

| ID | Issue | Root cause | Fix | Phase |
|----|-------|------------|-----|-------|
| BF-001 | Playwright E2E all failing on Windows | Used `127.0.0.1` instead of `localhost`; port conflicts | Switched to `localhost`, dedicated ports 5183/5184 | 12 |
| BF-002 | E2E driver login `#driver-email` not found | Driver tab not clicked before form | Click Officer/Driver tab before credential entry | 12 |
| BF-003 | Docker compose bash path spaces error | Unquoted paths in `_compose.sh` on Windows paths with spaces | Quoted `compose()` wrapper in deploy scripts | 13 |
| BF-004 | Nginx Docker build failure (Rollup) | Windows `node_modules` copied into Linux image | Root `.dockerignore` + `npm ci` in Dockerfile | 13 |
| BF-005 | Missing `.env.production` on docker prod up | No auto-create from example | `scripts/docker-prod.mjs` auto-creates from template | 13 |
| BF-006 | `package-lock.json` out of sync | Missing vitest/jsdom in lockfile | Ran `npm install` in both frontends | 13 |

---

## High fixes

| ID | Issue | Fix | Files |
|----|-------|-----|-------|
| BF-007 | Celery crash on Windows | Document `--pool=solo` | `docs/INSTALLATION-GUIDE.md` |
| BF-008 | CORS errors in dev | Vite proxy + `CORS_ALLOWED_ORIGINS` | frontend `.env.example` |
| BF-009 | AI detect returns mock in demo | `AI_USE_MOCK=False` enforcement in docs | `backend/.env.example` |
| BF-010 | UUID migration alignment | Patch initial migrations for UUID PKs | `backend/*/migrations/` |
| BF-011 | Health benchmark false negatives | Use `localhost` on Windows | `tests/performance/health-benchmark.mjs` |

---

## Medium fixes

| ID | Issue | Fix | Status |
|----|-------|-----|:------:|
| BF-012 | OCR exact-match 0% | Officer confirmation workflow; documented limitation | ✅ Won't fix v1.0 |
| BF-013 | Low recall (0.196) | Officer-in-the-loop; future retrain | ✅ Won't fix v1.0 |
| BF-014 | SQLite lock under concurrent test | Use PostgreSQL for CI or sequential tests | ✅ Mitigated |
| BF-015 | Email verify requires SMTP | Resend optional; dev skip documented | ✅ Documented |

---

## Open / deferred (post-thesis)

| ID | Issue | Priority | Target |
|----|-------|----------|--------|
| BF-016 | Plate OCR Cambodia fine-tune | High | v1.1 |
| BF-017 | Expand 10 → 31 sign classes | High | v1.1 |
| BF-018 | Real payment gateway | Medium | v1.2 |
| BF-019 | Mobile officer app | Low | v2.0 |
| BF-020 | Night/rain dataset gap | Medium | v1.1 |

---

## Verification commands

```bash
npm run test:backend:phase12   # Backend regression
npm run test:frontend          # Frontend unit tests
npm run test:e2e               # 4/4 Playwright scenarios
npm run docker:prod:up         # Production stack smoke (optional)
```

**Last run:** 2026-07-12 — E2E 4/4 PASS, phase12 backend PASS

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|:--------:|
| Developer | [Your Name] | 2026-07-12 | ✅ |
| Supervisor | | | ⬜ |

---

*Final bug fixes log — Phase 17 Task 416*
