#!/usr/bin/env node
/**
 * Task 006 — Environment validation
 * Checks .env exists and required variables are set.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
const examplePath = join(root, '.env.example');

const REQUIRED = [
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'DJANGO_SECRET_KEY',
  'VITE_API_URL',
];

function parseEnv(content) {
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    vars[key] = value;
  }
  return vars;
}

if (!existsSync(envPath)) {
  console.error('Environment validation FAILED.');
  console.error('Missing .env file. Run: npm run setup:env');
  process.exit(1);
}

const env = parseEnv(readFileSync(envPath, 'utf8'));
const missing = REQUIRED.filter((key) => !env[key]);

if (missing.length > 0) {
  console.error('Environment validation FAILED. Missing or empty variables:');
  missing.forEach((key) => console.error(`  - ${key}`));
  console.error(`\nSee ${examplePath} for reference.`);
  process.exit(1);
}

console.log('Environment validation PASSED.');
console.log(`  CAMTRAFFIC_ENV=${env.CAMTRAFFIC_ENV ?? 'development'}`);
console.log(`  POSTGRES_DB=${env.POSTGRES_DB}`);
console.log(`  POSTGRES_HOST=${env.POSTGRES_HOST ?? 'localhost'}`);
console.log(`  POSTGRES_PORT=${env.POSTGRES_PORT ?? '5434'}`);
