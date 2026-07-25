#!/usr/bin/env node
/**
 * Resolve the Django Python interpreter (prefer backend/venv over PATH/.venv).
 * Usage: node scripts/backend-python.mjs manage.py test ...
 *        node scripts/backend-python.mjs -c "import django"
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.join(root, 'src', 'backend');
const win = process.platform === 'win32';

const candidates = [
  path.join(backend, 'venv', win ? 'Scripts' : 'bin', win ? 'python.exe' : 'python'),
  path.join(root, '.venv', win ? 'Scripts' : 'bin', win ? 'python.exe' : 'python'),
];

function resolvePython() {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  // Fall back to PATH only when no project venv exists.
  for (const name of win ? ['python'] : ['python3', 'python']) {
    const probe = spawnSync(name, ['-c', 'import django'], {
      encoding: 'utf8',
      windowsHide: true,
    });
    if (probe.status === 0) return name;
  }
  return win ? 'python' : 'python3';
}

const python = resolvePython();
const args = process.argv.slice(2);
if (!args.length) {
  console.log(python);
  process.exit(0);
}

// Never use shell:true with absolute paths that contain spaces (breaks on Windows).
const result = spawnSync(python, args, {
  cwd: backend,
  stdio: 'inherit',
  windowsHide: true,
  env: process.env,
});
process.exit(result.status ?? 1);
