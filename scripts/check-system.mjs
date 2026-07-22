#!/usr/bin/env node
/**
 * CamTraffic Complete System Check
 * Verifies all components after restructuring
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║     CAMTRAFFIC SYSTEM STATUS CHECK                       ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const checks = {
  '📁 Project Structure': [
    { path: 'src/backend', desc: 'Backend source code' },
    { path: 'src/web/admin', desc: 'Admin frontend' },
    { path: 'src/web/user', desc: 'User frontend' },
    { path: 'src/services/ai-service', desc: 'AI service' },
    { path: 'ai/weights', desc: 'AI model weights' },
    { path: 'ai/datasets', desc: 'Training datasets' },
    { path: 'infrastructure/deploy', desc: 'Deployment configs' },
    { path: 'config', desc: 'Configuration' },
    { path: 'data', desc: 'Data management' },
    { path: 'reports', desc: 'Reports & analytics' },
    { path: 'governance', desc: 'IT governance' },
  ],
  
  '🐍 Backend Environment': [
    { path: 'src/backend/venv', desc: 'Python virtual environment' },
    { path: 'src/backend/manage.py', desc: 'Django management script' },
    { path: 'src/backend/.env', desc: 'Environment configuration' },
    { path: 'src/backend/requirements.txt', desc: 'Python dependencies' },
  ],
  
  '⚛️  Frontend Environment': [
    { path: 'src/web/admin/node_modules', desc: 'Admin dependencies' },
    { path: 'src/web/user/node_modules', desc: 'User dependencies' },
    { path: 'src/web/admin/.env', desc: 'Admin env config' },
    { path: 'src/web/user/.env', desc: 'User env config' },
    { path: 'src/web/admin/package.json', desc: 'Admin package' },
    { path: 'src/web/user/package.json', desc: 'User package' },
  ],
  
  '🤖 AI Components': [
    { path: 'ai/weights/pretrained', desc: 'Pretrained weights' },
    { path: 'ai/training/runs', desc: 'Training runs' },
    { path: 'ai/evaluation', desc: 'Model evaluation' },
    { path: 'src/services/ai-service/api.py', desc: 'AI service API', optional: true },
  ],
  
  '🐳 Docker Configuration': [
    { path: 'docker-compose.yml', desc: 'Docker Compose config' },
    { path: 'infra/docker/Dockerfile.backend', desc: 'Backend Dockerfile' },
    { path: 'infra/docker/Dockerfile.ai-vision', desc: 'AI Vision Dockerfile' },
    { path: 'infra/docker/Dockerfile.ocr', desc: 'OCR Dockerfile' },
  ],
  
  '📚 Documentation': [
    { path: 'README.md', desc: 'Project README' },
    { path: 'GOVERNMENT_STANDARD_STRUCTURE.md', desc: 'Government standard guide' },
    { path: 'FOLDER_STRUCTURE.md', desc: 'Structure documentation' },
    { path: 'config/README.md', desc: 'Config documentation' },
    { path: 'data/README.md', desc: 'Data documentation' },
  ],
};

let totalPassed = 0;
let totalFailed = 0;

for (const [category, items] of Object.entries(checks)) {
  console.log(`\n${category}`);
  console.log('─'.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const item of items) {
    const fullPath = path.join(root, item.path);
    const exists = fs.existsSync(fullPath);
    
    if (exists) {
      console.log(`  ✓ ${item.desc}`);
      passed++;
    } else if (item.optional) {
      console.log(`  ○ ${item.desc} (optional)`);
      passed++;
    } else {
      console.log(`  ✗ ${item.desc} - MISSING: ${item.path}`);
      failed++;
    }
  }
  
  totalPassed += passed;
  totalFailed += failed;
  
  const status = failed === 0 ? '✓ PASS' : `✗ FAIL (${failed} missing)`;
  console.log(`  ${status} - ${passed}/${items.length} items found`);
}

// Additional checks
console.log('\n\n🔍 Additional Checks');
console.log('─'.repeat(60));

// Check Python version
try {
  const pythonPath = process.platform === 'win32' 
    ? 'src/backend/venv/Scripts/python.exe'
    : 'src/backend/venv/bin/python';
  
  if (fs.existsSync(path.join(root, pythonPath))) {
    const version = execSync(`"${path.join(root, pythonPath)}" --version`, { encoding: 'utf8' }).trim();
    console.log(`  ✓ Python: ${version}`);
    totalPassed++;
  } else {
    console.log('  ✗ Python venv not found');
    totalFailed++;
  }
} catch (e) {
  console.log('  ✗ Python check failed');
  totalFailed++;
}

// Check Node version
try {
  const nodeVersion = process.version;
  console.log(`  ✓ Node.js: ${nodeVersion}`);
  totalPassed++;
} catch (e) {
  console.log('  ✗ Node.js not available');
  totalFailed++;
}

// Check AI weights
try {
  const weightsDir = path.join(root, 'ai/weights');
  const weights = fs.readdirSync(weightsDir, { recursive: true })
    .filter(f => f.endsWith('.pt'));
  console.log(`  ✓ AI Models: ${weights.length} weight files found`);
  totalPassed++;
} catch (e) {
  console.log('  ✗ AI weights directory issue');
  totalFailed++;
}

// Summary
console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
console.log('║                    SUMMARY                                ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log(`\n  Total Checks: ${totalPassed + totalFailed}`);
console.log(`  ✓ Passed: ${totalPassed}`);
console.log(`  ✗ Failed: ${totalFailed}`);

if (totalFailed === 0) {
  console.log('\n  🎉 ALL SYSTEMS OPERATIONAL! 🎉');
  console.log('\n  Your CamTraffic system is fully configured and ready.');
  console.log('\n  Next steps:');
  console.log('    1. npm run dev          - Start development servers');
  console.log('    2. npm run build        - Build for production');
  console.log('    3. npm run test:backend - Run backend tests');
  console.log('    4. docker compose up    - Start with Docker\n');
  process.exit(0);
} else {
  console.log('\n  ⚠️  Some components need attention.');
  console.log(`  ${totalFailed} item(s) missing or misconfigured.\n`);
  process.exit(1);
}
