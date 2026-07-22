#!/usr/bin/env node
/**
 * Thesis AI bundle: data manifest refresh, accuracy/pipeline tests, UAT matrix.
 * Run: npm run validate:ai-thesis
 */
import { spawnSync } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shell = process.platform === 'win32';
const aiRoot = path.join(root, 'ai');
const backend = path.join(root, 'src/backend');

function run(label, command, args, cwd = root) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell });
  if (result.status !== 0) {
    console.error(`\nFAILED: ${label}`);
    process.exit(result.status ?? 1);
  }
}

function assertExists(rel, label) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`MISSING ${label}: ${rel}`);
    process.exit(1);
  }
  console.log(`OK   ${label}`);
}

// --- Data: manifest + built yaml ---
run('Refresh collection manifest', 'python', ['ai/scripts/collection_tracker.py', '--write-manifest'], root);
assertExists('ai/datasets/manifests/collection_stats.json', 'collection_stats.json');
assertExists('ai/data.yaml', '248-class data.yaml');

const stats = JSON.parse(
  fs.readFileSync(path.join(aiRoot, 'datasets/manifests/collection_stats.json'), 'utf8'),
);
const signPct = (stats.traffic_signs?.collected ?? 0) / (stats.traffic_signs?.target || 1);
if (signPct < 0.9) {
  console.warn(`WARN sign collection ${(signPct * 100).toFixed(1)}% of tracker target (thesis uses built 248-class set)`);
}

// --- Accuracy / API / UAT ---
run('Detection stack (API + frontend client)', 'node', ['scripts/validate-detection-stack.mjs'], root);
run(
  'UAT matrix + detection alias tests',
  'python',
  ['manage.py', 'test', 'tests.test_uat_ai_detection_matrix', 'tests.test_detection_api_aliases', '--noinput'],
  backend,
);

// Phase 10 batch evidence (YOLO + optional pipeline sample — may take minutes on CPU)
const skipBatch = process.env.SKIP_PHASE10_BATCH === '1';
if (!skipBatch) {
  run('Phase 10 batch report (images/videos)', 'python', ['scripts/phase10_ai_detection_test.py', '--images', '20', '--videos', '5'], root);
} else {
  console.log('\n==> Phase 10 batch (skipped, SKIP_PHASE10_BATCH=1)');
}

console.log('\n✅ Thesis AI validation passed (data manifest, API UAT matrix, detection stack).');
console.log('   Optional: python ai/evaluation/run_phase10.py (full mAP report)');
console.log('   Optional: npm run test:e2e:officer-ai (browser UAT)');
console.log('   See docs/AI-DATA-ACCURACY-UAT-COMPLETION.md for 100% scope.');
