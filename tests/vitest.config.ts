import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(rootDir, '..');

export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    setupFiles: [path.join(rootDir, 'vitest.setup.ts')],
    include: [
      'frontend-admin/**/*.test.{ts,tsx}',
      'frontend-user/**/*.test.{ts,tsx}',
    ],
    root: rootDir,
  },
  resolve: {
    alias: {
      '@camtraffic/api': path.join(repoRoot, 'packages/api/src'),
      '@camtraffic/hooks': path.join(repoRoot, 'packages/hooks/src'),
      '@camtraffic/types': path.join(repoRoot, 'packages/types/src'),
      '@camtraffic/ui': path.join(repoRoot, 'packages/ui/src'),
      '@camtraffic/utils': path.join(repoRoot, 'packages/utils/src'),
    },
  },
});
