#!/usr/bin/env node
/**
 * Honest v1.0 production platform — deploy artifacts + system + AI + integration.
 * Run: npm run validate:production
 * See: docs/PRODUCTION-PLATFORM-COMPLETION.md
 */
import { spawnSync } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.join(root, 'backend');
const shell = process.platform === 'win32';

const deployArtifacts = [
  'deploy/docker/docker-compose.prod.yml',
  'deploy/docker/Dockerfile.backend.prod',
  'deploy/docker/Dockerfile.nginx.prod',
  'deploy/nginx/camtraffic.conf',
  'deploy/scripts/deploy_production.sh',
  'deploy/env/.env.production.example',
  'deploy/ssl/certbot-init.sh',
];

function run(label, command, args, cwd = root) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell });
  if (result.status !== 0) {
    console.error(`\nFAILED: ${label}`);
    process.exit(result.status ?? 1);
  }
}

function assertExists(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error(`MISSING deploy artifact: ${rel}`);
    process.exit(1);
  }
  console.log(`OK   ${rel}`);
}

console.log('==> Production deploy artifacts');
for (const rel of deployArtifacts) assertExists(rel);

const weights = path.join(root, 'ai/weights/best.pt');
if (!fs.existsSync(weights)) {
  console.error('MISSING AI weights: ai/weights/best.pt (required for production inference)');
  process.exit(1);
}
console.log('OK   ai/weights/best.pt');

if (fs.existsSync(path.join(root, 'apps/citizen/package.json'))) {
  console.log('OK   apps/citizen (PWA mobile channel)');
}

run('Production-truth env', 'node', ['scripts/validate-production-data-mode.mjs']);
run('System validation', 'node', ['scripts/validate-full-system.mjs']);
run('Thesis AI bundle', 'node', ['scripts/validate-ai-thesis.mjs']);
run('Backend integration', 'node', ['scripts/backend-python.mjs', 'scripts/validate_integration.py'], root);

const skipPay = process.env.SKIP_PAYMENTS_DATA_OCR === '1';
if (!skipPay) {
  run('Payments + data + OCR', 'node', ['scripts/validate-payments-data-ocr.mjs'], root);
} else {
  console.log('\n==> Payments/data/OCR (skipped, SKIP_PAYMENTS_DATA_OCR=1)');
}

console.log('\n✅ Production platform validation passed (honest v1.0 scope).');
console.log('   See docs/PRODUCTION-PLATFORM-COMPLETION.md for 100% definition.');
console.log('   Optional: npm run test:e2e:officer-ai · npm run docker:prod:up');
