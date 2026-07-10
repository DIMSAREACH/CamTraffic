#!/usr/bin/env node
/**
 * Task 009 — Locale parity validation
 * Ensures en and km dictionaries expose the same translation keys.
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const enModule = join(root, 'packages/ui/dist/locales/en.js');
const kmModule = join(root, 'packages/ui/dist/locales/km.js');

if (!existsSync(enModule) || !existsSync(kmModule)) {
  console.error('Locale validation requires a UI package build first.');
  console.error('Run: npm run build --workspace=@camtraffic/ui');
  process.exit(1);
}

const { en } = await import(pathToFileURL(enModule).href);
const { km } = await import(pathToFileURL(kmModule).href);

function collectKeys(object, prefix = '') {
  const keys = [];

  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...collectKeys(value, path));
    } else {
      keys.push(path);
    }
  }

  return keys.sort();
}

const enKeys = collectKeys(en);
const kmKeys = collectKeys(km);

const missingInKm = enKeys.filter((key) => !kmKeys.includes(key));
const missingInEn = kmKeys.filter((key) => !enKeys.includes(key));

if (missingInKm.length > 0 || missingInEn.length > 0) {
  console.error('Locale validation FAILED.');

  if (missingInKm.length > 0) {
    console.error('\nMissing in km.ts:');
    missingInKm.forEach((key) => console.error(`  - ${key}`));
  }

  if (missingInEn.length > 0) {
    console.error('\nMissing in en.ts:');
    missingInEn.forEach((key) => console.error(`  - ${key}`));
  }

  process.exit(1);
}

console.log('Locale validation PASSED.');
console.log(`Checked ${enKeys.length} translation keys for en/km parity.`);
