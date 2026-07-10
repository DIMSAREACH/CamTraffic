# Shared Types

> Task **109** — Shared Types (`@camtraffic/types`)

## Overview

Central TypeScript definitions for API payloads, paginated responses, and domain entities across admin, officer, driver, and AI workflows.

## API types

| Type | File | Description |
|------|------|-------------|
| `ApiResponse<T>` | `api/common.ts` | Standard success wrapper |
| `PaginatedResponse<T>` | `api/common.ts` | List results with count and links |
| `PaginationParams` | `api/common.ts` | Shared query params |
| `HealthStatus` | `api/monitoring.ts` | Service health checks |

## Entity groups

### Core domain

| Entity | File |
|--------|------|
| `User`, `UserRole` | `entities/user.ts` |
| `Officer` | `entities/officer.ts` |
| `Driver` | `entities/driver.ts` |
| `Vehicle` | `entities/vehicle.ts` |
| `Camera` | `entities/camera.ts` |
| `TrafficSign` | `entities/traffic-sign.ts` |
| `Violation` | `entities/violation.ts` |
| `Fine` | `entities/fine.ts` |
| `UserProfile` | `entities/profile.ts` |

### Admin management

| Area | Files |
|------|-------|
| Users & RBAC | `user-management.ts`, `role-management.ts`, `permission-management.ts` |
| Officers & stations | `officer-management.ts`, `police-station-management.ts` |
| Cameras & AI | `camera-management.ts`, `camera-live-dashboard.ts`, `camera-health-monitoring.ts`, `ai-model-management.ts`, `ai-model-version.ts`, `ai-training-history.ts`, `detection-monitoring.ts` |
| Signs | `sign-category-management.ts`, `traffic-sign-management.ts` |
| Operations | `report-management.ts`, `analytics-dashboard.ts`, `audit-log-management.ts`, `notification-template-management.ts`, `system-setting-management.ts`, `backup-management.ts` |
| Dashboard | `dashboard.ts` |

### Officer portal

| Area | Files |
|------|-------|
| Dashboard | `officer-dashboard.ts` |
| Live detection | `officer-live-detection.ts` |
| Violation review | `officer-violation-review.ts` |
| Evidence | `officer-evidence.ts` |
| Driver/vehicle mgmt | `officer-driver-management.ts`, `officer-vehicle-management.ts` |
| Profile & notifications | `officer-profile.ts`, `officer-notifications.ts` |
| Appeals | `officer-appeal-review.ts` |

### Driver portal

| Area | Files |
|------|-------|
| Dashboard | `driver-dashboard.ts` |
| Profile & vehicles | `driver-profile.ts`, `driver-vehicles.ts` |
| Violations & fines | `driver-violations.ts`, `driver-fines.ts` |
| Appeals & notifications | `driver-appeals.ts`, `driver-notifications.ts` |
| Settings | `driver-settings.ts` |

### AI / OCR

| Entity | File |
|--------|------|
| `OcrResult` | `entities/ocr-result.ts` |

## Usage

```ts
import type {
  PaginatedResponse,
  UserManagementRecord,
  OfficerViolationReviewDetail,
  DriverDashboardStats,
  OcrResult,
} from '@camtraffic/types';
```

All public types are re-exported from `packages/types/src/index.ts`.
