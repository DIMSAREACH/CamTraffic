#!/usr/bin/env node
/**
 * Copy .env.example to .env if .env does not exist.
 */

import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
const examplePath = join(root, '.env.example');

if (existsSync(envPath)) {
  console.log('.env already exists — skipped.');
  process.exit(0);
}

if (!existsSync(examplePath)) {
  console.error('Missing .env.example');
  process.exit(1);
}

copyFileSync(examplePath, envPath);
console.log('Created .env from .env.example');
console.log('Edit .env with your local credentials, then run: npm run validate:env');
