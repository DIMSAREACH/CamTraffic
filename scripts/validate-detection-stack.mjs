#!/usr/bin/env node
/** Detection stack: backend alias tests + frontend unit tests + endpoint parity. */
import { spawnSync } from 'child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shell = process.platform === 'win32';

function run(label, command, args, cwd = root) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell });
  if (result.status !== 0) {
    console.error(`\nFAILED: ${label}`);
    process.exit(result.status ?? 1);
  }
}

const endpointFiles = [
  'src/web/user/shared/services/detectionEndpoints.ts',
  'src/web/admin/shared/services/detectionEndpoints.ts',
];

for (const rel of endpointFiles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`MISSING ${rel}`);
    process.exit(1);
  }
}

const userHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, endpointFiles[0]))).digest('hex');
const adminHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, endpointFiles[1]))).digest('hex');
if (userHash !== adminHash) {
  console.error('DRIFT detectionEndpoints.ts between user and admin portals');
  process.exit(1);
}
console.log('OK   detectionEndpoints.ts (user/admin parity)');

run('Backend integration', 'node', ['scripts/backend-python.mjs', 'scripts/validate_integration.py'], root);
run('Backend detection API tests', 'node', ['scripts/backend-python.mjs', 'manage.py', 'test', 'tests.test_detection_api_aliases', '--noinput'], root);
run('Frontend user detection tests', 'npm', ['test', '--prefix', 'src/web/user']);

console.log('\n✅ Detection stack validation passed (API aliases, integration, frontend client).');
console.log('   Optional: npm run test:e2e:officer-ai');
