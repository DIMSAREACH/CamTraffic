# End-to-End Tests

> Task **118** — End-to-End Testing

## Overview

Playwright smoke tests for admin and user portal login pages.

## Files

| File | Coverage |
|------|----------|
| `specs/admin-smoke.spec.ts` | Admin portal login UI |
| `specs/user-smoke.spec.ts` | User portal login UI |
| `playwright.config.mjs` | Dual-portal browser projects |

## Run

```bash
npm run test:e2e
```

`test:e2e` automatically runs `playwright install chromium` first if browsers are missing.

Reuses existing dev servers on ports `5173` and `5174` when not running in CI.

## Status

- [x] Completed
