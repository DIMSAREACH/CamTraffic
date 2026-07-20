#!/usr/bin/env node
/** Docker production compose — always runs from repo root; auto-creates .env.production. */
import { spawnSync } from 'child_process';
import { copyFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const composeFile = path.join(repoRoot, 'deploy/docker/docker-compose.prod.yml');
const envExample = path.join(repoRoot, 'deploy/env/.env.production.example');
const envFile = path.join(repoRoot, 'deploy/env/.env.production');

const action = process.argv[2] || 'up';

if (!existsSync(envFile)) {
  if (!existsSync(envExample)) {
    console.error(`Missing ${envExample}`);
    process.exit(1);
  }
  copyFileSync(envExample, envFile);
  console.warn(
    `Created ${path.relative(repoRoot, envFile)} from example — edit SECRET_KEY and DB_PASSWORD before public deploy.`,
  );
}

const composeBase = [
  'compose',
  '-f',
  composeFile,
  '--env-file',
  envFile,
];

const commands = {
  up: null, // handled below (serial build avoids Docker Desktop OOM)
  down: [...composeBase, 'down'],
  logs: [...composeBase, 'logs', '-f'],
  restart: [...composeBase, 'restart', 'nginx'],
  ps: [...composeBase, 'ps'],
};

function runDocker(args) {
  const result = spawnSync('docker', args, {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  return result.status ?? 1;
}

/** Fail fast when Docker Desktop / daemon is down (common on Windows _ping 500). */
function ensureDockerReady() {
  const probe = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 20_000,
  });
  const errText = `${probe.stderr || ''}${probe.stdout || ''}${probe.error?.message || ''}`;
  const ok =
    probe.status === 0 &&
    !probe.error &&
    String(probe.stdout || '').trim().length > 0;

  if (ok) return;

  console.error(`
Docker is not available — the daemon did not respond (build/up cannot run).

On Windows (Docker Desktop):
  1. Start Docker Desktop and wait until status is "Running".
  2. If you see engine/API errors: Troubleshoot → Restart Docker Desktop.
  3. Confirm WSL 2 is enabled (Settings → General → Use the WSL 2 based engine).

Verify in a terminal:  docker info

Without Docker, run a local prod-like stack instead:
  npm run local:prod:up
`);
  if (errText.trim()) {
    console.error('Docker reported:\n', errText.trim().slice(0, 800));
  }
  process.exit(1);
}

if (action === 'up') {
  ensureDockerReady();
  // Build app image once, then nginx. Celery/AI reuse camtraffic-app:prod.
  for (const service of ['backend', 'nginx']) {
    const code = runDocker([...composeBase, 'build', service]);
    if (code !== 0) process.exit(code);
  }
  process.exit(runDocker([...composeBase, 'up', '-d']));
}

const args = commands[action];
if (!args) {
  console.error(`Unknown action: ${action}. Use: up | down | logs | restart | ps`);
  process.exit(1);
}

ensureDockerReady();

process.exit(runDocker(args));
