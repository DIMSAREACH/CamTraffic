#!/usr/bin/env node
/**
 * Ensure runtime folders exist (logs, media, backups).
 * Run: node scripts/scaffold-folders.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const dirs = [
  'backend/logs',
  'backend/media',
  'backend/backups',
  'backend/staticfiles',
  'ai/weights',
  'ai/runs',
  'docs/reports',
];

for (const rel of dirs) {
  const full = path.join(root, rel);
  fs.mkdirSync(full, { recursive: true });
  console.log(`OK ${rel}`);
}
