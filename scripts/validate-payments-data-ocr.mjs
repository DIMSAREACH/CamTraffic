#!/usr/bin/env node
/**
 * Live payments + enterprise data manifest + production OCR checks.
 * Run: npm run validate:payments-data-ocr
 */
import { spawnSync } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.join(root, 'backend');
const shell = process.platform === 'win32';

function run(label, command, args, cwd = root) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell });
  if (result.status !== 0) {
    console.error(`\nFAILED: ${label}`);
    process.exit(result.status ?? 1);
  }
}

run('Refresh collection manifest', 'python', ['ai/scripts/collection_tracker.py', '--write-manifest']);
const stats = JSON.parse(
  fs.readFileSync(path.join(root, 'ai/datasets/manifests/collection_stats.json'), 'utf8'),
);

const checks = [
  ['traffic_signs', stats.traffic_signs?.collected, stats.traffic_signs?.target],
  ['vehicles', stats.vehicles?.collected, stats.vehicles?.target],
  ['license_plates', stats.license_plates?.collected, stats.license_plates?.target],
  ['road_footage', stats.road_footage?.collected_total, stats.road_footage?.target_total],
];

for (const [name, got, target] of checks) {
  const pct = (got / target) * 100;
  if (pct < 99.5) {
    console.error(`FAIL ${name}: ${got}/${target} (${pct.toFixed(1)}%) — need ≥99.5%`);
    process.exit(1);
  }
  console.log(`OK   ${name} ${got}/${target} (${pct.toFixed(1)}%)`);
}

run('Live payment API tests', 'node', ['scripts/backend-python.mjs', 'manage.py', 'test', 'tests.test_live_payments', '--noinput'], root);
run('Plate OCR normalize tests', 'node', ['scripts/backend-python.mjs', 'manage.py', 'test', 'tests.test_plate_ocr_normalize', '--noinput'], root);

const skipOcr = process.env.SKIP_OCR_EVAL === '1';
if (!skipOcr) {
  run('Production OCR eval (manifest)', 'python', ['ai/training/ocr/eval_production_ocr.py', '--limit', '30'], root);
} else {
  console.log('\n==> OCR eval skipped (SKIP_OCR_EVAL=1)');
}

console.log('\n✅ Payments + data + OCR validation passed.');
console.log('   Configure live gateways: PAYMENT_MODE=live, STRIPE_*, KHQR_* in backend/.env');
console.log('   See docs/PAYMENTS-DATA-OCR-COMPLETION.md');
