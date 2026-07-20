import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(e2eDir, '../..');
const reuseExistingServer = !process.env.CI;

/** Dedicated ports so E2E does not fight with `npm run dev` on 5173/5174. */
const userPort = process.env.E2E_USER_PORT || '5183';
const adminPort = process.env.E2E_ADMIN_PORT || '5184';
/** Match Vite `server.host` (127.0.0.1) — `localhost` can miss the dev server on Windows. */
const userBase = process.env.E2E_USER_URL || `http://127.0.0.1:${userPort}`;
const adminBase = process.env.E2E_ADMIN_URL || `http://127.0.0.1:${adminPort}`;

export default defineConfig({
  testDir: e2eDir,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'python manage.py migrate --noinput && python manage.py seed_demo && python manage.py runserver 127.0.0.1:8000 --noreload',
      cwd: path.join(repoRoot, 'backend'),
      url: 'http://localhost:8000/health/',
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      command: 'npm run dev:admin',
      cwd: repoRoot,
      url: adminBase,
      reuseExistingServer,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_ADMIN_PORT: adminPort,
        VITE_USER_PORT: userPort,
      },
    },
    {
      command: 'npm run dev:user',
      cwd: repoRoot,
      url: userBase,
      reuseExistingServer,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_ADMIN_PORT: adminPort,
        VITE_USER_PORT: userPort,
      },
    },
  ],
  projects: [
    {
      name: 'admin-chromium',
      testMatch: /admin-login\.spec\.ts|accessibility\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: adminBase },
    },
    {
      name: 'user-chromium',
      testMatch: /user-login\.spec\.ts|user-accessibility\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: userBase },
    },
  ],
});
