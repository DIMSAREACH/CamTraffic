#!/usr/bin/env node
/** Run Playwright E2E from repo root (works from backend/ or any subfolder). */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const e2eDir = path.join(repoRoot, 'tests', 'e2e');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: e2eDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('npm', ['install']);
run('npx', ['playwright', 'install', 'chromium']);
run('npm', ['test']);
