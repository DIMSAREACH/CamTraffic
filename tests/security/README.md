# CamTraffic — Security Test Suite

**Phase 12 — Tasks 322, 326, 335–337**

## Automated coverage

| Area | Module | Tests |
|------|--------|------:|
| Security headers | `backend/tests/security/test_security.py` | 1 |
| Login rate limiting | `backend/tests/security/test_security.py` | 2 |
| RBAC permissions | `backend/tests/security/test_security.py` | 4 |
| RBAC API authorization | `backend/tests/security/test_rbac_authorization.py` | 3 |
| SQL injection (ORM) | Django ORM parameterized queries — manual UAT §4.3 |
| File upload MIME | `backend/tests/test_e2e_pipeline.py` — non-image rejected |

## Run

```bash
cd backend
python manage.py test tests.security -v 2
```

## XSS prevention

- API responses use DRF `JSONRenderer` with `Content-Type: application/json`.
- Security middleware sets `X-Content-Type-Options: nosniff` on all responses (including `/health/`).
- User-generated HTML is not echoed in API payloads; frontends render React text nodes (auto-escaped).
- Uploaded images are validated server-side; non-image MIME types return **400**.

## JWT

- Access tokens expire per `SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']` (default 60 minutes).
- Refresh via `POST /api/auth/refresh/` with `{ "refresh": "<token>" }`.
- Logout blacklists refresh token when `rest_framework_simplejwt.token_blacklist` is enabled.

## RBAC matrix (summary)

| Endpoint | Admin | Police | Driver |
|----------|:-----:|:------:|:------:|
| `/api/users/` | ✅ | ❌ | ❌ |
| `/api/rbac/roles/` | ✅ | ❌ | ❌ |
| `/api/dashboard/admin/` | ✅ | ❌ | ❌ |
| `/api/notifications/` | ✅ | ✅ | ✅ |
| `/api/fines/` | ✅ | ✅ | own |

See `docs/final-year-project/UAT-REPORT.md` for manual role matrix validation.
