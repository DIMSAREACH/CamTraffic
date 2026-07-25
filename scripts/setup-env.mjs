#!/usr/bin/env node
/**
 * Copy .env.example → .env when .env is missing (never overwrites).
 * Run: node scripts/setup-env.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const pairs = [
  ['src/backend/.env.example', 'src/backend/.env'],
  ['src/web/admin/.env.example', 'src/web/admin/.env'],
  ['src/web/user/.env.example', 'src/web/user/.env'],
];

for (const [example, target] of pairs) {
  const examplePath = path.join(root, example);
  const targetPath = path.join(root, target);
  if (!fs.existsSync(examplePath)) {
    console.warn(`Skip ${target}: no ${example}`);
    continue;
  }
  if (fs.existsSync(targetPath)) {
    console.log(`Keep ${target} (already exists)`);
    continue;
  }
  fs.copyFileSync(examplePath, targetPath);
  console.log(`Created ${target} from ${example}`);
}
