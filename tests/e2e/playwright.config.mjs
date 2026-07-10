import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(configDir, '../..');

const adminBaseUrl = process.env.CAMTRAFFIC_ADMIN_URL ?? 'http://localhost:5173';
const userBaseUrl = process.env.CAMTRAFFIC_USER_URL ?? 'http://localhost:5174';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'admin-chromium',
      use: { ...devices['Desktop Chrome'], baseURL: adminBaseUrl },
    },
    {
      name: 'user-chromium',
      use: { ...devices['Desktop Chrome'], baseURL: userBaseUrl },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:admin',
      cwd: repoRoot,
      url: adminBaseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev:user',
      cwd: repoRoot,
      url: userBaseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
