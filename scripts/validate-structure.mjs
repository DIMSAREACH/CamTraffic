#!/usr/bin/env node
/**
 * CamTraffic structure validation — checks required paths exist.
 * Run: node scripts/validate-structure.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const groups = {
  'docs': [
    'docs/PRD.md',
    'docs/SRS.md',
    'docs/ARCHITECTURE.md',
    'docs/ARCHITECTURE-DIAGRAMS.md',
    'docs/SCHEMA.sql',
    'docs/CHECKLIST.md',
    'docs/FOLDER-MAP.md',
    'docs/README.md',
  ],
  'root-config': [
    'package.json',
    'turbo.json',
    'tsconfig.base.json',
    '.prettierrc.json',
    'docker-compose.yml',
    'README.md',
  ],
  'packages': [
    'packages/types/package.json',
    'packages/utils/package.json',
    'packages/api/package.json',
    'packages/hooks/package.json',
    'packages/ui/package.json',
    'packages/store/package.json',
    'packages/query/package.json',
  ],
  'backend-core': [
    'backend/manage.py',
    'backend/camtraffic/settings.py',
    'backend/camtraffic/urls.py',
    'backend/config/logging.py',
    'backend/config/monitoring.py',
    'backend/requirements.txt',
  ],
  'backend-apps': [
    'backend/authentication',
    'backend/users',
    'backend/ai_detection',
    'backend/violations',
    'backend/fines',
    'backend/appeals',
    'backend/traffic_signs',
    'backend/vehicles',
    'backend/infrastructure',
    'backend/dashboard',
    'backend/notifications',
    'backend/audit',
    'backend/rbac',
  ],
  'frontend-admin': [
    'frontend-admin/package.json',
    'frontend-admin/routes.tsx',
    'frontend-admin/tsconfig.json',
    'frontend-admin/.oxlintrc.json',
    'frontend-admin/.env.example',
    'frontend-admin/shared/pages/AIDetectionPage.tsx',
    'frontend-admin/admin/layout/AdminLayout.tsx',
  ],
  'frontend-user': [
    'frontend-user/package.json',
    'frontend-user/routes.tsx',
    'frontend-user/tsconfig.json',
    'frontend-user/.oxlintrc.json',
    'frontend-user/.env.example',
    'frontend-user/user/layout/UserLayout.tsx',
  ],
  'ai': [
    'ai/README.md',
    'ai/requirements.txt',
    'ai/dataset_10/classes.txt',
  ],
  'infra': [
    'infra/docker/Dockerfile.backend',
    'infra/docker/Dockerfile.celery',
  ],
  'scripts': [
    'scripts/validate-structure.mjs',
    'scripts/validate-env.mjs',
    'scripts/setup-env.mjs',
    'scripts/scaffold-folders.mjs',
  ],
};

let failed = 0;
let passed = 0;

for (const [group, paths] of Object.entries(groups)) {
  const missing = paths.filter((rel) => !fs.existsSync(path.join(root, rel)));
  if (missing.length) {
    console.error(`FAIL ${group}: missing ${missing.join(', ')}`);
    failed += missing.length;
  } else {
    console.log(`OK   ${group} (${paths.length} paths)`);
    passed += paths.length;
  }
}

console.log(`\nStructure validation: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
