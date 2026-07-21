#!/usr/bin/env node
/**
 * Validate production-truth frontend env (.env files must not enable mock in production builds).
 * Run: node scripts/validate-production-data-mode.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const targets = [
  'frontend-admin/.env',
  'frontend-admin/.env.example',
  'frontend-user/.env',
  'frontend-user/.env.example',
];

function parseEnv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const out = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return out;
}

let failed = 0;

for (const rel of targets) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.warn(`SKIP missing ${rel}`);
    continue;
  }
  const env = parseEnv(full);
  if (env.VITE_USE_MOCK === 'true') {
    console.error(`FAIL ${rel}: VITE_USE_MOCK must be false for production truth`);
    failed++;
    continue;
  }
  if (env.VITE_USE_SAMPLE_FALLBACK === 'true' && !rel.endsWith('.env.example')) {
    console.error(`FAIL ${rel}: VITE_USE_SAMPLE_FALLBACK must be false for real data`);
    failed++;
    continue;
  }
  if (env.VITE_USE_SAMPLE_FALLBACK === 'true' && rel.endsWith('.env.example')) {
    console.warn(`WARN ${rel}: VITE_USE_SAMPLE_FALLBACK=true — set false in examples for real-data default`);
  }
  console.log(`OK   ${rel} — production-truth (${env.VITE_USE_MOCK ?? 'unset'} mock)`);
}

process.exit(failed ? 1 : 0);
