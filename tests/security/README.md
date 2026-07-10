# Security Tests

> Task **120** — Security Testing

## Overview

Automated checks for security headers, login rate limiting, and RBAC authorization.

## Files

| File | Coverage |
|------|----------|
| `test_security_headers.py` | `SecurityHardeningMiddleware` response headers |
| `test_login_rate_limit.py` | Login endpoint rate limiting (429) |
| `test_rbac_authorization.py` | Role-based access to admin APIs |

## Run

```bash
npm run test:backend
```

## Status

- [x] Completed
