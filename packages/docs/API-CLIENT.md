# API Client

> Task **107** — API Client Package (`@camtraffic/api`)

## Overview

Typed HTTP client for the CamTraffic Django REST API. Endpoint modules are factory functions that receive an `ApiClient` instance and return typed method groups.

## Quick start

```ts
import { createCamTrafficApi } from '@camtraffic/api';

const api = createCamTrafficApi({
  baseUrl: 'http://localhost:8000',
  getAccessToken: () => localStorage.getItem('camtraffic_access_token'),
});

const { data } = await api.auth.login({ email, password });
const users = await api.users.list({ page: 1 });
```

## Core modules

| Module | Path | Purpose |
|--------|------|---------|
| `ApiClient` | `src/client.ts` | GET/POST/PUT/PATCH/DELETE with JSON helpers |
| `createCamTrafficApi` | `src/index.ts` | Composes all endpoint factories |
| Auth interceptors | `src/interceptors/auth.ts` | Token injection and 401 handling |
| Error helpers | `src/interceptors/error.ts` | `ApiError` parsing |

## Endpoint modules

| Module | File | Domain |
|--------|------|--------|
| `auth` | `endpoints/auth.ts` | Login, logout, refresh, me |
| `health` | `endpoints/health.ts` | Backend health |
| `profile` | `endpoints/profile.ts` | User profile and avatar |
| `users` | `endpoints/users.ts` | Admin user management |
| `roles` | `endpoints/roles.ts` | RBAC roles |
| `permissions` | `endpoints/permissions.ts` | RBAC permissions |
| `officers` | `endpoints/officers.ts` | Officer management |
| `policeStations` | `endpoints/police-stations.ts` | Police stations |
| `drivers` | `endpoints/drivers.ts` | Driver management |
| `vehicles` | `endpoints/vehicles.ts` | Vehicle registry |
| `cameras` | `endpoints/cameras.ts` | Camera management and live views |
| `trafficSigns` | `endpoints/traffic-signs.ts` | Sign categories and signs |
| `aiModels` | `endpoints/ai-models.ts` | AI model versions and training |
| `detections` | `endpoints/detections.ts` | Detection monitoring |
| `ocr` | `endpoints/ocr.ts` | OCR results |
| `violations` | `endpoints/violations.ts` | Violations |
| `fines` | `endpoints/fines.ts` | Fines |
| `appeals` | `endpoints/appeals.ts` | Appeals (driver and officer review) |
| `reports` | `endpoints/reports.ts` | Reports |
| `notifications` | `endpoints/notifications.ts` | Notification templates |
| `audit` | `endpoints/audit.ts` | Audit logs and login history |
| `system` | `endpoints/system.ts` | System settings and backup |
| `dashboard` | `endpoints/dashboard.ts` | Admin, officer, and driver dashboards |

## Conventions

- Responses use `ApiResponse<T>` and `PaginatedResponse<T>` from `@camtraffic/types`.
- List endpoints accept `PaginationParams` (`page`, `page_size`, `search`, etc.).
- Portal-specific shapes are typed in `@camtraffic/types` entity modules.

See [backend/docs/API.md](../../backend/docs/API.md) for REST route reference.
