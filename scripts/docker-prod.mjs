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
  up: [...composeBase, 'up', '-d', '--build'],
  down: [...composeBase, 'down'],
  logs: [...composeBase, 'logs', '-f'],
  restart: [...composeBase, 'restart', 'nginx'],
  ps: [...composeBase, 'ps'],
};

const args = commands[action];
if (!args) {
  console.error(`Unknown action: ${action}. Use: up | down | logs | restart | ps`);
  process.exit(1);
}

const result = spawnSync('docker', args, {
  cwd: repoRoot,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
