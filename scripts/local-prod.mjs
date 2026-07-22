#!/usr/bin/env node
/**
 * Local production-like stack (no Docker).
 * Builds SPAs, runs Waitress (Windows-safe WSGI) + vite preview for admin/user.
 *
 *   npm run local:prod:up
 *   npm run local:prod:down
 */
import { spawn, spawnSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pidDir = path.join(repoRoot, '.local-prod');
const pidFile = path.join(pidDir, 'pids.json');
const action = process.argv[2] || 'up';

const USER_PORT = Number(process.env.LOCAL_PROD_USER_PORT || 4173);
const ADMIN_PORT = Number(process.env.LOCAL_PROD_ADMIN_PORT || 4174);
const API_PORT = Number(process.env.LOCAL_PROD_API_PORT || 8000);
const API_ORIGIN = `http://127.0.0.1:${API_PORT}`;

function py() {
  const win = path.join(repoRoot, '.venv', 'Scripts', 'python.exe');
  const nix = path.join(repoRoot, '.venv', 'bin', 'python');
  if (existsSync(win)) return win;
  if (existsSync(nix)) return nix;
  return process.platform === 'win32' ? 'python' : 'python3';
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd || repoRoot,
    stdio: 'inherit',
    env: { ...process.env, ...opts.env },
    shell: opts.shell ?? false,
  });
  if ((r.status ?? 1) !== 0) {
    console.error(`Command failed: ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitHttp(url, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) resolve();
          else reject(new Error(`status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(3000, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      return;
    } catch {
      await sleep(1000);
    }
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function stopTracked() {
  if (!existsSync(pidFile)) {
    console.log('No local-prod pid file found.');
    return;
  }
  let data;
  try {
    data = JSON.parse(readFileSync(pidFile, 'utf8'));
  } catch {
    unlinkSync(pidFile);
    return;
  }
  for (const [name, pid] of Object.entries(data.pids || {})) {
    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        process.kill(pid);
      }
      console.log(`Stopped ${name} (pid ${pid})`);
    } catch {
      console.log(`Already stopped: ${name} (pid ${pid})`);
    }
  }
  try {
    unlinkSync(pidFile);
  } catch {
    /* ignore */
  }
}

function npmBin() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function ensureWaitress() {
  const check = spawnSync(py(), ['-c', 'import waitress'], { cwd: repoRoot });
  if (check.status === 0) return;
  console.log('Installing waitress (Windows WSGI server)...');
  run(py(), ['-m', 'pip', 'install', 'waitress>=3.0']);
}

function buildSpas() {
  const env = {
    ...process.env,
    VITE_API_URL: '/api',
    VITE_USE_MOCK: 'false',
    VITE_USE_SAMPLE_FALLBACK: 'false',
  };
  console.log('\n==> Building user SPA');
  run(npmBin(), ['run', 'build', '--prefix', 'frontend-user'], { env });
  console.log('\n==> Building admin SPA');
  run(npmBin(), ['run', 'build', '--prefix', 'frontend-admin'], { env });
}

function prepareBackend() {
  const env = {
    ...process.env,
    DJANGO_SETTINGS_MODULE: 'camtraffic.settings_local_prod',
    SECURE_SSL_REDIRECT: 'False',
    USE_REDIS: 'False',
  };
  console.log('\n==> migrate + collectstatic');
  run(py(), ['manage.py', 'migrate', '--noinput'], { cwd: path.join(repoRoot, 'backend'), env });
  run(py(), ['manage.py', 'collectstatic', '--noinput'], {
    cwd: path.join(repoRoot, 'backend'),
    env,
  });
}

function startProcess(name, cmd, args, opts = {}) {
  const cwd = opts.cwd || repoRoot;
  const env = { ...process.env, ...opts.env };

  // On Windows, Start-Process so the process survives when this script exits.
  if (process.platform === 'win32') {
    const argList = args.map((a) => `'${String(a).replace(/'/g, "''")}'`).join(',');
    const envAssignments = Object.entries(opts.env || {})
      .map(([k, v]) => `$env:${k}='${String(v).replace(/'/g, "''")}';`)
      .join(' ');
    const ps = [
      envAssignments,
      `$p = Start-Process -FilePath '${cmd.replace(/'/g, "''")}'`,
      `-ArgumentList @(${argList})`,
      `-WorkingDirectory '${cwd.replace(/'/g, "''")}'`,
      `-WindowStyle Hidden -PassThru;`,
      `Write-Output $p.Id`,
    ].join(' ');
    const r = spawnSync('powershell.exe', ['-NoProfile', '-Command', ps], {
      encoding: 'utf8',
      env,
    });
    const pid = Number(String(r.stdout || '').trim().split(/\r?\n/).pop());
    if (!pid || Number.isNaN(pid)) {
      console.error(`Failed to start ${name}: ${r.stderr || r.stdout}`);
      process.exit(1);
    }
    console.log(`Started ${name} (pid ${pid})`);
    return pid;
  }

  const child = spawn(cmd, args, {
    cwd,
    env,
    stdio: 'ignore',
    detached: true,
    shell: opts.shell ?? false,
  });
  child.unref();
  if (!child.pid) {
    console.error(`Failed to start ${name}`);
    process.exit(1);
  }
  console.log(`Started ${name} (pid ${child.pid})`);
  return child.pid;
}

async function up() {
  mkdirSync(pidDir, { recursive: true });
  if (existsSync(pidFile)) {
    console.log('Stopping previous local-prod processes...');
    stopTracked();
    await sleep(1500);
  }

  // Skip rebuild when dist already exists (faster restarts).
  ensureWaitress();
  if (process.env.LOCAL_PROD_SKIP_BUILD === '1') {
    console.log('Skipping SPA build (LOCAL_PROD_SKIP_BUILD=1)');
  } else {
    buildSpas();
  }
  prepareBackend();

  const apiEnv = {
    DJANGO_SETTINGS_MODULE: 'camtraffic.settings_local_prod',
    SECURE_SSL_REDIRECT: 'False',
    USE_REDIS: 'False',
    PYTHONUNBUFFERED: '1',
  };

  const pids = {};
  pids.api = startProcess(
    'api',
    py(),
    [
      '-m',
      'waitress',
      `--listen=127.0.0.1:${API_PORT}`,
      '--threads=8',
      '--channel-timeout=120',
      'camtraffic.wsgi:application',
    ],
    { cwd: path.join(repoRoot, 'backend'), env: apiEnv },
  );

  console.log('\n==> Waiting for API...');
  await waitHttp(`${API_ORIGIN}/health/`);

  const previewEnv = {
    VITE_API_URL: '/api',
    VITE_API_PROXY_TARGET: API_ORIGIN,
    VITE_USE_MOCK: 'false',
    VITE_USE_SAMPLE_FALLBACK: 'false',
    VITE_USER_PORT: String(USER_PORT),
    VITE_ADMIN_PORT: String(ADMIN_PORT),
  };

  pids.user = startProcess(
    'user-spa',
    npmBin(),
    [
      'run',
      'preview',
      '--prefix',
      'frontend-user',
      '--',
      '--host',
      '127.0.0.1',
      '--port',
      String(USER_PORT),
      '--strictPort',
    ],
    { env: previewEnv },
  );

  pids.admin = startProcess(
    'admin-spa',
    npmBin(),
    [
      'run',
      'preview',
      '--prefix',
      'frontend-admin',
      '--',
      '--host',
      '127.0.0.1',
      '--port',
      String(ADMIN_PORT),
      '--strictPort',
    ],
    { env: previewEnv },
  );

  writeFileSync(pidFile, JSON.stringify({ startedAt: new Date().toISOString(), pids }, null, 2));

  console.log('\n==> Waiting for SPAs...');
  await waitHttp(`http://127.0.0.1:${USER_PORT}/`);
  await waitHttp(`http://127.0.0.1:${ADMIN_PORT}/`);

  console.log(`
✅ Local production stack is up

  API     ${API_ORIGIN}
  User    http://127.0.0.1:${USER_PORT}
  Admin   http://127.0.0.1:${ADMIN_PORT}

  Demo: admin@camtraffic.demo / CamTraffic@2026!
        officer@camtraffic.demo / CamTraffic@2026!
        driver@camtraffic.demo / CamTraffic@2026!

  Stop with: npm run local:prod:down
`);
}

if (action === 'up') {
  up().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else if (action === 'down') {
  stopTracked();
} else {
  console.error('Usage: node scripts/local-prod.mjs up|down');
  process.exit(1);
}
