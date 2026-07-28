#!/usr/bin/env node
/**
 * Fail when frontend-admin/shared and frontend-user/shared diverge on Phase 3 core files.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const tracked = [
  'shared/context/AuthContext.tsx',
  'shared/utils/authStorage.ts',
  'shared/utils/authEvents.ts',
  'shared/utils/portal.ts',
  'shared/hooks/queries/useDashboardQueries.ts',
  'shared/services/detectionEndpoints.ts',
];

function hashFile(rel) {
  const full = path.join(root, rel);
  return crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
}

let failed = 0;

for (const rel of tracked) {
  const adminRel = path.join('frontend-admin', rel);
  const userRel = path.join('frontend-user', rel);
  if (!fs.existsSync(path.join(root, adminRel)) || !fs.existsSync(path.join(root, userRel))) {
    console.error(`MISSING ${rel}`);
    failed++;
    continue;
  }
  const adminHash = hashFile(adminRel);
  const userHash = hashFile(userRel);
  if (adminHash !== userHash) {
    console.error(`DRIFT ${rel}`);
    failed++;
  } else {
    console.log(`OK   ${rel}`);
  }
}

process.exit(failed ? 1 : 0);
