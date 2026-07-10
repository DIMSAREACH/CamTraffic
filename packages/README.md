# CamTraffic Shared Packages

Monorepo workspace packages consumed by `frontend-admin` and `frontend-user`.

## Packages

| Package | Import | Description |
|---------|--------|-------------|
| `@camtraffic/types` | `import type { User } from '@camtraffic/types'` | Domain & API TypeScript types |
| `@camtraffic/utils` | `import { cn, formatDate } from '@camtraffic/utils'` | Formatting & validation helpers |
| `@camtraffic/api` | `import { createCamTrafficApi } from '@camtraffic/api'` | Typed HTTP API client |
| `@camtraffic/hooks` | `import { useDebounce } from '@camtraffic/hooks'` | Shared React hooks |
| `@camtraffic/ui` | `import { Button, ThemeProvider } from '@camtraffic/ui'` | Components, theme, i18n |

## Dependency Graph

```text
types  (no deps)
  ↑
api, hooks (peer: react)
utils  (no deps)
  ↑
ui (depends on utils)
  ↑
frontend-admin, frontend-user
```

## Structure

```text
packages/
├── types/src/
│   ├── entities/     # User, Vehicle, Violation, ...
│   └── api/          # ApiResponse, PaginatedResponse, ...
├── utils/src/
│   ├── format/       # date, currency
│   └── validation/   # email, phone
├── api/src/
│   ├── client.ts
│   ├── endpoints/    # auth, health
│   └── interceptors/
├── hooks/src/        # useToggle, useDebounce, useLocalStorage
└── ui/src/
    ├── components/   # Button, Input, Card, Spinner
    ├── theme/        # ThemeProvider, tokens (Task 008)
    ├── locales/      # en, km, I18nProvider (Task 009)
    └── styles/       # base.css
```

## Commands

```bash
# Build all packages
npm run build --workspace=@camtraffic/types
npm run build --workspace=@camtraffic/utils
npm run build --workspace=@camtraffic/api
npm run build --workspace=@camtraffic/hooks
npm run build --workspace=@camtraffic/ui

# Or via Turborepo (includes frontends)
npm run build
```

## Usage in Frontends

```tsx
// main.tsx
import { ThemeProvider, I18nProvider } from '@camtraffic/ui';
import '@camtraffic/ui/styles/base.css';

// lib/api.ts
import { createCamTrafficApi } from '@camtraffic/api';
```

## Status — Task 003

- [x] Package structure and exports
- [x] TypeScript project references
- [x] Domain types foundation
- [x] API client with auth endpoints
- [x] Shared hooks
- [x] UI components + theme + locales foundation
- [x] Wired into both frontends

Phase 7 (Tasks 106–112) will expand each package with full component library and endpoints.
