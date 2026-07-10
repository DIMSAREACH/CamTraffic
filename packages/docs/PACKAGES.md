# Shared Packages Index

> Phase 7 complete — Tasks **106–112**

| Package | Path | Tasks | Status |
|---------|------|-------|--------|
| UI | `packages/ui/` | 003, 106, 111, 112 | Complete |
| API Client | `packages/api/` | 003, 107 | Complete |
| Hooks | `packages/hooks/` | 003, 108 | Complete |
| Types | `packages/types/` | 003, 109 | Complete |
| Utils | `packages/utils/` | 003, 110 | Complete |

## Documentation

| Doc | Description |
|-----|-------------|
| [COMPONENTS.md](./COMPONENTS.md) | UI component library (Task 106) |
| [API-CLIENT.md](./API-CLIENT.md) | Typed HTTP client and endpoints (Task 107) |
| [TYPES.md](./TYPES.md) | Entity and API type catalog (Task 109) |

## Usage

```ts
import { Button, Card, I18nProvider, ThemeProvider } from '@camtraffic/ui';
import { createCamTrafficApi } from '@camtraffic/api';
import { useAsync, usePagination } from '@camtraffic/hooks';
import type { User, Violation } from '@camtraffic/types';
import { cn, formatFileSize, slugify } from '@camtraffic/utils';
```

See [packages/README.md](../README.md) for the dependency graph and workspace commands.
