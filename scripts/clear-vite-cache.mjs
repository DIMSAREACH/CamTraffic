#!/usr/bin/env node
/** Remove Vite pre-bundle caches (fixes 504 Outdated Optimize Dep). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const rel of ['frontend-admin/node_modules/.vite', 'frontend-user/node_modules/.vite']) {
  const target = path.join(root, rel);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`cleared ${rel}`);
  }
}

console.log('Vite cache cleared. Restart dev servers (npm run dev).');
