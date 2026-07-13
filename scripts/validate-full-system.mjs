#!/usr/bin/env node
/**
 * Full system validation — structure, env templates, backend, frontend.
 * Run: npm run validate:system
 */
import { spawnSync } from 'child_process';
import path from 'path';
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

run('Structure', 'node', ['scripts/validate-structure.mjs']);
run('Env templates', 'node', ['scripts/validate-env.mjs']);
run('Backend tests (Phase 12)', 'npm', ['run', 'test:backend:phase12']);
run('Frontend tests', 'npm', ['run', 'test:frontend']);

console.log('\n✅ System validation passed (structure, env, backend, frontend).');
console.log('   Optional: npm run test:e2e (requires Playwright + seed_demo)');
console.log('   Demo setup: npm run seed:demo && npm run dev');
