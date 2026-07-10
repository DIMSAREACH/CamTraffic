#!/usr/bin/env node
/**
 * Scaffolds task-aligned folders with README.md placeholders
 * across the CamTraffic monorepo.
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** @type {{ path: string, title: string, phase: string, tasks: string, description: string }[]} */
const folders = [
  // ── docs ──────────────────────────────────────────────────────────
  { path: 'docs/phases', title: 'Development Phases', phase: 'All', tasks: '001–128', description: 'Phase-by-phase development guides and task references.' },

  // ── frontend-admin ────────────────────────────────────────────────
  { path: 'frontend-admin/src/app', title: 'App Shell', phase: 'Phase 3', tasks: '025–027', description: 'Root app shell, providers, and global configuration.' },
  { path: 'frontend-admin/src/routes', title: 'Admin Routing', phase: 'Phase 3', tasks: '026', description: 'Route definitions and protected route guards.' },
  { path: 'frontend-admin/src/layouts', title: 'Admin Layout', phase: 'Phase 3', tasks: '027–030', description: 'Main layout with sidebar, header, and footer.' },
  { path: 'frontend-admin/src/components', title: 'Admin Components', phase: 'Phase 3', tasks: '025', description: 'Shared admin-only UI components.' },
  { path: 'frontend-admin/src/lib', title: 'Admin Lib', phase: 'Phase 3', tasks: '025', description: 'Utilities, constants, and helpers for admin portal.' },
  { path: 'frontend-admin/src/themes', title: 'Theme System', phase: 'Phase 1', tasks: '008, 111', description: 'Light/dark theme tokens and theme provider.' },
  { path: 'frontend-admin/src/locales', title: 'Localization', phase: 'Phase 1', tasks: '009, 112', description: 'Khmer and English translation files.' },
  { path: 'frontend-admin/src/features/auth', title: 'Admin Authentication', phase: 'Phase 2', tasks: '015, 017–019', description: 'Login, forgot password, reset password, change password.' },
  { path: 'frontend-admin/src/features/dashboard', title: 'Dashboard', phase: 'Phase 3', tasks: '031–037', description: 'Statistics, charts, activities, AI summary, camera status, notifications.' },
  { path: 'frontend-admin/src/features/users', title: 'User Management', phase: 'Phase 3', tasks: '038', description: 'User CRUD operations for administrators.' },
  { path: 'frontend-admin/src/features/roles', title: 'Role Management', phase: 'Phase 3', tasks: '039', description: 'Role CRUD and role assignment.' },
  { path: 'frontend-admin/src/features/permissions', title: 'Permission Management', phase: 'Phase 3', tasks: '040, 014', description: 'Permission CRUD and access control UI.' },
  { path: 'frontend-admin/src/features/officers', title: 'Officer Management', phase: 'Phase 3', tasks: '041', description: 'Traffic officer profiles and assignments.' },
  { path: 'frontend-admin/src/features/police-stations', title: 'Police Station Management', phase: 'Phase 3', tasks: '042', description: 'Police station CRUD and location management.' },
  { path: 'frontend-admin/src/features/ai-models', title: 'AI Model Management', phase: 'Phase 3', tasks: '043–046', description: 'Model management, versioning, training history, detection monitoring.' },
  { path: 'frontend-admin/src/features/cameras', title: 'Camera Management', phase: 'Phase 3', tasks: '047–049', description: 'Camera CRUD, live dashboard, and health monitoring.' },
  { path: 'frontend-admin/src/features/traffic-signs', title: 'Traffic Sign Management', phase: 'Phase 3', tasks: '050–051', description: 'Traffic sign CRUD and category management.' },
  { path: 'frontend-admin/src/features/reports', title: 'Reports', phase: 'Phase 3', tasks: '052, 054', description: 'Report generation and PDF/Excel export.' },
  { path: 'frontend-admin/src/features/analytics', title: 'Analytics Dashboard', phase: 'Phase 3', tasks: '053', description: 'Analytics charts and data visualization.' },
  { path: 'frontend-admin/src/features/audit-logs', title: 'Audit Logs', phase: 'Phase 3', tasks: '055, 023', description: 'System audit logs and login history.' },
  { path: 'frontend-admin/src/features/notifications', title: 'Notification Templates', phase: 'Phase 3', tasks: '056', description: 'Notification template management.' },
  { path: 'frontend-admin/src/features/system-settings', title: 'System Settings', phase: 'Phase 3', tasks: '057', description: 'Global system configuration.' },
  { path: 'frontend-admin/src/features/backup', title: 'Backup & Restore', phase: 'Phase 3', tasks: '058', description: 'Database backup and restore UI.' },
  { path: 'frontend-admin/src/features/profile', title: 'Admin Profile', phase: 'Phase 2', tasks: '021–022', description: 'User profile and avatar upload.' },

  // ── frontend-user ───────────────────────────────────────────────
  { path: 'frontend-user/src/app', title: 'App Shell', phase: 'Phase 4', tasks: '059', description: 'Root app shell and global providers.' },
  { path: 'frontend-user/src/routes', title: 'User Routing', phase: 'Phase 4', tasks: '060', description: 'Officer and driver route definitions.' },
  { path: 'frontend-user/src/layouts/officer', title: 'Officer Layout', phase: 'Phase 4', tasks: '061', description: 'Layout shell for traffic officers.' },
  { path: 'frontend-user/src/layouts/driver', title: 'Driver Layout', phase: 'Phase 4', tasks: '062', description: 'Layout shell for drivers.' },
  { path: 'frontend-user/src/components', title: 'User Components', phase: 'Phase 4', tasks: '059', description: 'Shared user portal components.' },
  { path: 'frontend-user/src/lib', title: 'User Lib', phase: 'Phase 4', tasks: '059', description: 'Utilities and helpers for user portal.' },
  { path: 'frontend-user/src/themes', title: 'Theme System', phase: 'Phase 1', tasks: '008, 111', description: 'Light/dark theme for user portal.' },
  { path: 'frontend-user/src/locales', title: 'Localization', phase: 'Phase 1', tasks: '009, 112', description: 'Khmer and English translations.' },
  { path: 'frontend-user/src/features/auth', title: 'User Authentication', phase: 'Phase 2', tasks: '016–019', description: 'Login, password flows for officers and drivers.' },
  { path: 'frontend-user/src/features/officer/dashboard', title: 'Officer Dashboard', phase: 'Phase 4', tasks: '063', description: 'Officer home dashboard and summary widgets.' },
  { path: 'frontend-user/src/features/officer/live-detection', title: 'Live Detection', phase: 'Phase 4', tasks: '064', description: 'Real-time AI detection monitoring.' },
  { path: 'frontend-user/src/features/officer/live-camera', title: 'Live Camera View', phase: 'Phase 4', tasks: '065', description: 'Live camera stream viewer.' },
  { path: 'frontend-user/src/features/officer/violations', title: 'Violation Review', phase: 'Phase 4', tasks: '066–067', description: 'Review, approve, and reject violations.' },
  { path: 'frontend-user/src/features/officer/drivers', title: 'Driver Management', phase: 'Phase 4', tasks: '068', description: 'Officer-side driver management.' },
  { path: 'frontend-user/src/features/officer/vehicles', title: 'Vehicle Management', phase: 'Phase 4', tasks: '069', description: 'Officer-side vehicle management.' },
  { path: 'frontend-user/src/features/officer/evidence', title: 'Evidence Viewer', phase: 'Phase 4', tasks: '070', description: 'Violation evidence image and video viewer.' },
  { path: 'frontend-user/src/features/officer/reports', title: 'Officer Reports', phase: 'Phase 4', tasks: '071', description: 'Officer report generation and export.' },
  { path: 'frontend-user/src/features/officer/notifications', title: 'Officer Notifications', phase: 'Phase 4', tasks: '072', description: 'Officer notification center.' },
  { path: 'frontend-user/src/features/officer/profile', title: 'Officer Profile', phase: 'Phase 4', tasks: '073', description: 'Officer profile management.' },
  { path: 'frontend-user/src/features/driver/dashboard', title: 'Driver Dashboard', phase: 'Phase 4', tasks: '074', description: 'Driver home dashboard.' },
  { path: 'frontend-user/src/features/driver/profile', title: 'Driver Profile', phase: 'Phase 4', tasks: '075', description: 'Driver profile management.' },
  { path: 'frontend-user/src/features/driver/vehicles', title: 'My Vehicles', phase: 'Phase 4', tasks: '076', description: 'Driver vehicle registration and management.' },
  { path: 'frontend-user/src/features/driver/violations', title: 'My Violations', phase: 'Phase 4', tasks: '077', description: 'Driver violation history.' },
  { path: 'frontend-user/src/features/driver/fines', title: 'Fine Management', phase: 'Phase 4', tasks: '078–079', description: 'Fine payment and payment history.' },
  { path: 'frontend-user/src/features/driver/appeals', title: 'Appeal Submission', phase: 'Phase 4', tasks: '080', description: 'Violation appeal submission.' },
  { path: 'frontend-user/src/features/driver/notifications', title: 'Driver Notifications', phase: 'Phase 4', tasks: '081', description: 'Driver notification center.' },
  { path: 'frontend-user/src/features/driver/settings', title: 'Driver Settings', phase: 'Phase 4', tasks: '082', description: 'Driver account and preference settings.' },

  // ── backend ─────────────────────────────────────────────────────
  { path: 'backend/config', title: 'Django Config', phase: 'Phase 1', tasks: '004, 006, 007, 024', description: 'Django settings, logging, middleware, and environment config.' },
  { path: 'backend/apps/accounts', title: 'Accounts App', phase: 'Phase 2', tasks: '011–012, 020, 091', description: 'JWT auth, refresh tokens, email verification.' },
  { path: 'backend/apps/rbac', title: 'RBAC App', phase: 'Phase 2', tasks: '013–014', description: 'Roles, permissions, and access control.' },
  { path: 'backend/apps/users', title: 'Users App', phase: 'Phase 2/6', tasks: '021–023, 092', description: 'User profiles, avatars, login history.' },
  { path: 'backend/apps/officers', title: 'Officers App', phase: 'Phase 3/6', tasks: '041–042, 093', description: 'Officer and police station management APIs.' },
  { path: 'backend/apps/drivers', title: 'Drivers App', phase: 'Phase 4/6', tasks: '068, 094', description: 'Driver management APIs.' },
  { path: 'backend/apps/vehicles', title: 'Vehicles App', phase: 'Phase 4/6', tasks: '069, 076, 095', description: 'Vehicle registration and management APIs.' },
  { path: 'backend/apps/cameras', title: 'Cameras App', phase: 'Phase 3/6', tasks: '047–049, 096', description: 'Camera CRUD and health monitoring APIs.' },
  { path: 'backend/apps/traffic_signs', title: 'Traffic Signs App', phase: 'Phase 3/6', tasks: '050–051, 097', description: 'Traffic sign and category APIs.' },
  { path: 'backend/apps/ai_models', title: 'AI Models App', phase: 'Phase 3/5', tasks: '043–045', description: 'AI model versioning and training history.' },
  { path: 'backend/apps/detections', title: 'Detections App', phase: 'Phase 5/6', tasks: '046, 087–089, 098', description: 'AI detection results and history APIs.' },
  { path: 'backend/apps/ocr', title: 'OCR App', phase: 'Phase 5/6', tasks: '085, 099', description: 'OCR processing and result APIs.' },
  { path: 'backend/apps/violations', title: 'Violations App', phase: 'Phase 4/6', tasks: '066–067, 100', description: 'Violation review and approval APIs.' },
  { path: 'backend/apps/fines', title: 'Fines App', phase: 'Phase 4/6', tasks: '078–079, 101', description: 'Fine issuance and payment APIs.' },
  { path: 'backend/apps/appeals', title: 'Appeals App', phase: 'Phase 4/6', tasks: '080, 102', description: 'Violation appeal APIs.' },
  { path: 'backend/apps/reports', title: 'Reports App', phase: 'Phase 3/6', tasks: '052–054, 103', description: 'Report generation and export APIs.' },
  { path: 'backend/apps/notifications', title: 'Notifications App', phase: 'Phase 3/6', tasks: '056–057, 104', description: 'Notification and template APIs.' },
  { path: 'backend/apps/dashboard', title: 'Dashboard App', phase: 'Phase 3/6', tasks: '032–037, 105', description: 'Dashboard statistics and summary APIs.' },
  { path: 'backend/apps/audit', title: 'Audit App', phase: 'Phase 3', tasks: '055, 023', description: 'Audit log and activity tracking.' },
  { path: 'backend/apps/system', title: 'System App', phase: 'Phase 3', tasks: '057–058', description: 'System settings, backup, and restore.' },

  // ── ai-service ────────────────────────────────────────────────────
  { path: 'ai-service/app/detection', title: 'YOLOv11 Detection', phase: 'Phase 5', tasks: '083', description: 'YOLOv11 traffic sign detection service.' },
  { path: 'ai-service/app/processing', title: 'OpenCV Processing', phase: 'Phase 5', tasks: '084', description: 'Image preprocessing and postprocessing with OpenCV.' },
  { path: 'ai-service/app/ocr', title: 'EasyOCR Service', phase: 'Phase 5', tasks: '085', description: 'License plate and text recognition with EasyOCR.' },
  { path: 'ai-service/app/pipeline', title: 'Detection Pipeline', phase: 'Phase 5', tasks: '086', description: 'End-to-end detection pipeline orchestration.' },
  { path: 'ai-service/app/storage', title: 'AI Result Storage', phase: 'Phase 5', tasks: '087', description: 'Persist and retrieve detection results.' },
  { path: 'ai-service/app/metrics', title: 'AI Performance Metrics', phase: 'Phase 5', tasks: '088', description: 'Inference speed, accuracy, and model metrics.' },
  { path: 'ai-service/app/api', title: 'Detection History API', phase: 'Phase 5', tasks: '089', description: 'REST endpoints for detection history.' },
  { path: 'ai-service/app/health', title: 'AI Health Monitoring', phase: 'Phase 5', tasks: '090', description: 'Service health checks and status endpoints.' },

  // ── packages ────────────────────────────────────────────────────
  { path: 'packages/ui/src/components', title: 'UI Components', phase: 'Phase 7', tasks: '106', description: 'Shared React component library.' },
  { path: 'packages/ui/src/theme', title: 'Shared Theme', phase: 'Phase 7', tasks: '111', description: 'Shared light/dark theme system.' },
  { path: 'packages/ui/src/locales', title: 'Shared Localization', phase: 'Phase 7', tasks: '112', description: 'Shared Khmer/English i18n resources.' },
  { path: 'packages/api/src/endpoints', title: 'API Endpoints', phase: 'Phase 7', tasks: '107', description: 'Typed API client endpoint modules.' },
  { path: 'packages/api/src/interceptors', title: 'API Interceptors', phase: 'Phase 7', tasks: '107', description: 'Auth token injection and error handling.' },
  { path: 'packages/hooks/src', title: 'Shared Hooks', phase: 'Phase 7', tasks: '108', description: 'Reusable React hooks.' },
  { path: 'packages/types/src/entities', title: 'Entity Types', phase: 'Phase 7', tasks: '109', description: 'Domain entity TypeScript interfaces.' },
  { path: 'packages/types/src/api', title: 'API Types', phase: 'Phase 7', tasks: '109', description: 'Request/response TypeScript types.' },
  { path: 'packages/utils/src/format', title: 'Format Utilities', phase: 'Phase 7', tasks: '110', description: 'Date, currency, and text formatting.' },
  { path: 'packages/utils/src/validation', title: 'Validation Utilities', phase: 'Phase 7', tasks: '110', description: 'Shared validation helpers.' },

  // ── tests ───────────────────────────────────────────────────────
  { path: 'tests/backend', title: 'Backend Unit Tests', phase: 'Phase 8', tasks: '113', description: 'Django app unit tests.' },
  { path: 'tests/frontend-admin', title: 'Frontend Admin Tests', phase: 'Phase 8', tasks: '114', description: 'Admin portal component and feature tests.' },
  { path: 'tests/frontend-user', title: 'Frontend User Tests', phase: 'Phase 8', tasks: '115', description: 'User portal component and feature tests.' },
  { path: 'tests/api', title: 'API Tests', phase: 'Phase 8', tasks: '116', description: 'REST API endpoint tests.' },
  { path: 'tests/integration', title: 'Integration Tests', phase: 'Phase 8', tasks: '117', description: 'Cross-service integration tests.' },
  { path: 'tests/e2e', title: 'End-to-End Tests', phase: 'Phase 8', tasks: '118', description: 'Full user flow E2E tests.' },
  { path: 'tests/performance', title: 'Performance Tests', phase: 'Phase 8', tasks: '119', description: 'Load and performance benchmarks.' },
  { path: 'tests/security', title: 'Security Tests', phase: 'Phase 8', tasks: '120', description: 'Security vulnerability and penetration tests.' },

  // ── deploy ──────────────────────────────────────────────────────
  { path: 'deploy/docker', title: 'Docker Configuration', phase: 'Phase 1/9', tasks: '002, 121', description: 'Development and production Dockerfiles.' },
  { path: 'deploy/nginx', title: 'Nginx Configuration', phase: 'Phase 9', tasks: '122', description: 'Reverse proxy and static file serving.' },
  { path: 'deploy/gunicorn', title: 'Gunicorn Configuration', phase: 'Phase 9', tasks: '123', description: 'WSGI server configuration for Django.' },
  { path: 'deploy/celery', title: 'Redis & Celery', phase: 'Phase 9', tasks: '124', description: 'Background task worker configuration.' },
  { path: 'deploy/cicd', title: 'CI/CD Pipeline', phase: 'Phase 9', tasks: '125', description: 'GitHub Actions workflows.' },
  { path: 'deploy/ssl', title: 'SSL & HTTPS', phase: 'Phase 9', tasks: '127', description: 'TLS certificate and HTTPS setup.' },
  { path: 'deploy/env', title: 'Production Environment', phase: 'Phase 9', tasks: '126', description: 'Production environment variable templates.' },
];

function readme({ title, phase, tasks, description, folderPath }) {
  return `# ${title}

> **${phase}** · Tasks **${tasks}**

## Overview

${description}

## Folder

\`${folderPath}/\`

## Planned Structure

\`\`\`text
${folderPath}/
├── README.md          # This file
└── ...                # Implementation files (to be added)
\`\`\`

## Related Tasks

| Task | Status |
|------|--------|
${tasks.split(/[,–]/).filter(Boolean).map((t) => {
  const id = t.trim().replace(/^(\d+).*/, '$1').padStart(3, '0');
  if (!/^\d+$/.test(id)) return null;
  return `| Task ${id} | ⬜ Not started |`;
}).filter(Boolean).join('\n')}

## Status

- [ ] Scaffolded
- [ ] In progress
- [ ] Completed

## Notes

_Add implementation notes here as development progresses._
`;
}

let created = 0;
let skipped = 0;

for (const folder of folders) {
  const fullPath = join(root, folder.path);
  mkdirSync(fullPath, { recursive: true });

  const readmePath = join(fullPath, 'README.md');
  const content = readme({ ...folder, folderPath: folder.path });

  if (existsSync(readmePath)) {
    skipped++;
    continue;
  }

  writeFileSync(readmePath, content, 'utf8');
  created++;
}

// Per-feature READMEs from folders list above already cover most paths.
// Create top-level service README stubs where missing.
const serviceReadmes = [
  {
    path: 'frontend-admin/docs/FEATURES.md',
    content: `# Frontend Admin — Feature Index

Super Administrator Portal for CamTraffic.

## Feature Modules

| Module | Path | Tasks |
|--------|------|-------|
| Auth | \`src/features/auth/\` | 015, 017–019 |
| Dashboard | \`src/features/dashboard/\` | 031–037 |
| Users | \`src/features/users/\` | 038 |
| Roles | \`src/features/roles/\` | 039 |
| Permissions | \`src/features/permissions/\` | 040 |
| Officers | \`src/features/officers/\` | 041 |
| Police Stations | \`src/features/police-stations/\` | 042 |
| AI Models | \`src/features/ai-models/\` | 043–046 |
| Cameras | \`src/features/cameras/\` | 047–049 |
| Traffic Signs | \`src/features/traffic-signs/\` | 050–051 |
| Reports | \`src/features/reports/\` | 052, 054 |
| Analytics | \`src/features/analytics/\` | 053 |
| Audit Logs | \`src/features/audit-logs/\` | 055 |
| Notifications | \`src/features/notifications/\` | 056 |
| System Settings | \`src/features/system-settings/\` | 057 |
| Backup | \`src/features/backup/\` | 058 |
`,
  },
  {
    path: 'frontend-user/docs/FEATURES.md',
    content: `# Frontend User — Feature Index

Traffic Officer & Driver Portal for CamTraffic.

## Officer Features

| Module | Path | Tasks |
|--------|------|-------|
| Dashboard | \`src/features/officer/dashboard/\` | 063 |
| Live Detection | \`src/features/officer/live-detection/\` | 064 |
| Live Camera | \`src/features/officer/live-camera/\` | 065 |
| Violations | \`src/features/officer/violations/\` | 066–067 |
| Drivers | \`src/features/officer/drivers/\` | 068 |
| Vehicles | \`src/features/officer/vehicles/\` | 069 |
| Evidence | \`src/features/officer/evidence/\` | 070 |
| Reports | \`src/features/officer/reports/\` | 071 |
| Notifications | \`src/features/officer/notifications/\` | 072 |
| Profile | \`src/features/officer/profile/\` | 073 |

## Driver Features

| Module | Path | Tasks |
|--------|------|-------|
| Dashboard | \`src/features/driver/dashboard/\` | 074 |
| Profile | \`src/features/driver/profile/\` | 075 |
| Vehicles | \`src/features/driver/vehicles/\` | 076 |
| Violations | \`src/features/driver/violations/\` | 077 |
| Fines | \`src/features/driver/fines/\` | 078–079 |
| Appeals | \`src/features/driver/appeals/\` | 080 |
| Notifications | \`src/features/driver/notifications/\` | 081 |
| Settings | \`src/features/driver/settings/\` | 082 |
`,
  },
  {
    path: 'backend/docs/API.md',
    content: `# Backend API Index

Django REST API modules for CamTraffic.

## Apps

| App | Path | Tasks |
|-----|------|-------|
| Accounts | \`apps/accounts/\` | 011–012, 091 |
| RBAC | \`apps/rbac/\` | 013–014 |
| Users | \`apps/users/\` | 092 |
| Officers | \`apps/officers/\` | 093 |
| Drivers | \`apps/drivers/\` | 094 |
| Vehicles | \`apps/vehicles/\` | 095 |
| Cameras | \`apps/cameras/\` | 096 |
| Traffic Signs | \`apps/traffic_signs/\` | 097 |
| Detections | \`apps/detections/\` | 098 |
| OCR | \`apps/ocr/\` | 099 |
| Violations | \`apps/violations/\` | 100 |
| Fines | \`apps/fines/\` | 101 |
| Appeals | \`apps/appeals/\` | 102 |
| Reports | \`apps/reports/\` | 103 |
| Notifications | \`apps/notifications/\` | 104 |
| Dashboard | \`apps/dashboard/\` | 105 |
`,
  },
  {
    path: 'ai-service/docs/MODULES.md',
    content: `# AI Service Modules

YOLOv11 + OpenCV + EasyOCR detection pipeline.

| Module | Path | Tasks |
|--------|------|-------|
| Detection | \`app/detection/\` | 083 |
| Processing | \`app/processing/\` | 084 |
| OCR | \`app/ocr/\` | 085 |
| Pipeline | \`app/pipeline/\` | 086 |
| Storage | \`app/storage/\` | 087 |
| Metrics | \`app/metrics/\` | 088 |
| API | \`app/api/\` | 089 |
| Health | \`app/health/\` | 090 |
`,
  },
  {
    path: 'packages/docs/PACKAGES.md',
    content: `# Shared Packages Index

| Package | Path | Tasks |
|---------|------|-------|
| UI | \`packages/ui/\` | 106, 111, 112 |
| API Client | \`packages/api/\` | 107 |
| Hooks | \`packages/hooks/\` | 108 |
| Types | \`packages/types/\` | 109 |
| Utils | \`packages/utils/\` | 110 |
`,
  },
  {
    path: 'tests/README.md',
    content: `# CamTraffic Test Suite

Quality assurance structure for Phase 8.

| Suite | Path | Task |
|-------|------|------|
| Backend Unit | \`tests/backend/\` | 113 |
| Frontend Admin | \`tests/frontend-admin/\` | 114 |
| Frontend User | \`tests/frontend-user/\` | 115 |
| API | \`tests/api/\` | 116 |
| Integration | \`tests/integration/\` | 117 |
| E2E | \`tests/e2e/\` | 118 |
| Performance | \`tests/performance/\` | 119 |
| Security | \`tests/security/\` | 120 |
`,
  },
  {
    path: 'deploy/README.md',
    content: `# CamTraffic Deployment

DevOps and production deployment (Phase 9).

| Area | Path | Tasks |
|------|------|-------|
| Docker | \`deploy/docker/\` | 002, 121 |
| Nginx | \`deploy/nginx/\` | 122 |
| Gunicorn | \`deploy/gunicorn/\` | 123 |
| Celery | \`deploy/celery/\` | 124 |
| CI/CD | \`deploy/cicd/\` | 125 |
| Environment | \`deploy/env/\` | 126 |
| SSL | \`deploy/ssl/\` | 127 |
`,
  },
];

for (const file of serviceReadmes) {
  const fullPath = join(root, file.path);
  mkdirSync(dirname(fullPath), { recursive: true });
  if (!existsSync(fullPath)) {
    writeFileSync(fullPath, file.content, 'utf8');
    created++;
  } else {
    skipped++;
  }
}

console.log(`Folder scaffold complete: ${created} README files created, ${skipped} skipped.`);
