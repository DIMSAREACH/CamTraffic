#!/usr/bin/env node
/**
 * Full system — real data only (no mock API, no sample merge, live DB + AI).
 * Run: npm run validate:real-data
 */
import { spawnSync } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.join(root, 'backend');
const shell = process.platform === 'win32';

const envFiles = [
  'frontend-user/.env',
  'frontend-user/.env.example',
  'frontend-admin/.env',
  'frontend-admin/.env.example',
  'apps/citizen/.env.example',
];

function parseEnv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const out = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return out;
}

function run(label, command, args, cwd = root) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell });
  if (result.status !== 0) {
    console.error(`\nFAILED: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log('==> Frontend production-truth env');
let failed = 0;
for (const rel of envFiles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.log(`SKIP ${rel}`);
    continue;
  }
  const env = parseEnv(full);
  const mock = (env.VITE_USE_MOCK ?? 'false').toLowerCase();
  const sample = (env.VITE_USE_SAMPLE_FALLBACK ?? 'false').toLowerCase();
  if (mock === 'true') {
    console.error(`FAIL ${rel}: VITE_USE_MOCK must be false`);
    failed++;
    continue;
  }
  if (sample === 'true' && rel.endsWith('.env')) {
    console.error(`FAIL ${rel}: VITE_USE_SAMPLE_FALLBACK must be false for real data`);
    failed++;
    continue;
  }
  if (sample === 'true' && rel.endsWith('.env.example')) {
    console.warn(`WARN ${rel}: set VITE_USE_SAMPLE_FALLBACK=false in examples`);
  }
  console.log(`OK   ${rel}`);
}
if (failed) process.exit(1);

run('Backend real-data runtime', 'node', ['scripts/backend-python.mjs', 'scripts/verify_real_data.py'], root);
run('Detection stack', 'node', ['scripts/validate-detection-stack.mjs'], root);

const skipProd = process.env.SKIP_FULL_PRODUCTION_VALIDATE === '1';
if (!skipProd) {
  run('Production platform', 'node', ['scripts/validate-production-platform.mjs'], root);
} else {
  console.log('\n==> Full production validate skipped (SKIP_FULL_PRODUCTION_VALIDATE=1)');
}

console.log('\n✅ Real-data system validation passed.');
console.log('   Docs: docs/REAL-DATA-SYSTEM-COMPLETION.md');
console.log('   Seed: npm run seed:production');
