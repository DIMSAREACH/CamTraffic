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
    'src/backend/manage.py',
    'src/backend/camtraffic/settings.py',
    'src/backend/camtraffic/urls.py',
    'src/backend/config/logging.py',
    'src/backend/config/monitoring.py',
    'src/backend/requirements.txt',
  ],
  'backend-apps': [
    'src/backend/authentication',
    'src/backend/users',
    'src/backend/ai_detection',
    'src/backend/violations',
    'src/backend/fines',
    'src/backend/appeals',
    'src/backend/traffic_signs',
    'src/backend/vehicles',
    'src/backend/infrastructure',
    'src/backend/dashboard',
    'src/backend/notifications',
    'src/backend/audit',
    'src/backend/rbac',
  ],
  'frontend-admin': [
    'src/web/admin/package.json',
    'src/web/admin/routes.tsx',
    'src/web/admin/tsconfig.json',
    'src/web/admin/.oxlintrc.json',
    'src/web/admin/.env.example',
    'src/web/admin/shared/pages/AIDetectionPage.tsx',
    'src/web/admin/admin/layout/AdminLayout.tsx',
  ],
  'frontend-user': [
    'src/web/user/package.json',
    'src/web/user/routes.tsx',
    'src/web/user/tsconfig.json',
    'src/web/user/.oxlintrc.json',
    'src/web/user/.env.example',
    'src/web/user/user/layout/UserLayout.tsx',
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
    'scripts/backend-python.mjs',
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
