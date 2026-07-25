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

const extraArgs = process.argv.slice(2);
const playwrightArgs = extraArgs[0] === '--' ? extraArgs.slice(1) : extraArgs;
if (playwrightArgs.length > 0) {
  run('npx', ['playwright', 'test', '-c', 'playwright.config.ts', ...playwrightArgs]);
} else {
  run('npm', ['test']);
}
