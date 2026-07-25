#!/usr/bin/env node
/**
 * Live payments + enterprise data manifest + production OCR checks.
 * Run: npm run validate:payments-data-ocr
 *
 * Honest v1.0 (docs/PRODUCTION-PLATFORM-COMPLETION.md): the 17 696 grand
 * collection tracker is NOT required for production platform 100%.
 * Runtime requires AI weights; dataset volume is warned when incomplete.
 */
import { spawnSync } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shell = process.platform === 'win32';

function run(label, command, args, cwd = root) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell });
  if (result.status !== 0) {
    console.error(`\nFAILED: ${label}`);
    process.exit(result.status ?? 1);
  }
}

const weightsOk =
  fs.existsSync(path.join(root, 'ai/weights/best.pt')) &&
  fs.existsSync(path.join(root, 'ai/weights/best_cambodia_vehicles.pt')) &&
  fs.existsSync(path.join(root, 'ai/weights/best_cambodia_plates.pt'));

if (!weightsOk) {
  console.error('FAIL production AI weights missing under ai/weights/');
  process.exit(1);
}
console.log('OK   production AI weights (signs + vehicles + plates)');

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

const requireGrand = process.env.REQUIRE_GRAND_DATASET === '1';
for (const [name, got, target] of checks) {
  const g = Number(got) || 0;
  const t = Number(target) || 1;
  const pct = (g / t) * 100;
  if (pct < 99.5) {
    if (requireGrand) {
      console.error(`FAIL ${name}: ${g}/${t} (${pct.toFixed(1)}%) — need ≥99.5% (REQUIRE_GRAND_DATASET=1)`);
      process.exit(1);
    }
    console.warn(
      `WARN ${name}: ${g}/${t} (${pct.toFixed(1)}%) — grand collection optional for v1.0 (set REQUIRE_GRAND_DATASET=1 to enforce)`,
    );
  } else {
    console.log(`OK   ${name} ${g}/${t} (${pct.toFixed(1)}%)`);
  }
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
