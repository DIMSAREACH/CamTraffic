# @camtraffic/types

Shared TypeScript types for the CamTraffic monorepo.

## Exports

- **API:** `ApiResponse`, `PaginatedResponse`, `PaginationParams`, `HealthStatus`
- **Core entities:** `User`, `Officer`, `Driver`, `Vehicle`, `Camera`, `TrafficSign`, `Violation`, `Fine`
- **Portal types:** admin management, officer workflows, driver self-service, OCR results

Full catalog: [packages/docs/TYPES.md](../docs/TYPES.md)

## Usage

```ts
import type { User, Violation, PaginatedResponse, OcrResult } from '@camtraffic/types';
```
