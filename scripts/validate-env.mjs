#!/usr/bin/env node
/**
 * Validate .env.example files contain required keys.
 * Run: node scripts/validate-env.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const envSpecs = {
  'backend/.env.example': ['SECRET_KEY', 'DEBUG', 'ALLOWED_HOSTS'],
  'frontend-admin/.env.example': ['VITE_API_URL', 'VITE_USE_MOCK', 'VITE_USE_SAMPLE_FALLBACK'],
  'frontend-user/.env.example': ['VITE_API_URL', 'VITE_USE_MOCK', 'VITE_USE_SAMPLE_FALLBACK'],
};

function parseKeys(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('=')[0].trim());
}

let failed = 0;

for (const [rel, required] of Object.entries(envSpecs)) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`FAIL missing file: ${rel}`);
    failed++;
    continue;
  }
  const keys = new Set(parseKeys(full));
  const missing = required.filter((k) => !keys.has(k));
  if (missing.length) {
    console.error(`FAIL ${rel}: missing keys ${missing.join(', ')}`);
    failed++;
  } else {
    console.log(`OK   ${rel}`);
  }
}

process.exit(failed ? 1 : 0);
