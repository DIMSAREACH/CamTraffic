import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ['../tests/frontend-user/**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
      '@user': path.resolve(__dirname, 'user'),
      '@officer': path.resolve(__dirname, 'officer'),
      '@citizen': path.resolve(__dirname, 'citizen'),
    },
  },
  define: {
    'import.meta.env.VITE_ADMIN_PORT': JSON.stringify('5174'),
    'import.meta.env.VITE_USER_PORT': JSON.stringify('5173'),
    'import.meta.env.VITE_PORTAL_SURFACE': JSON.stringify('user'),
  },
});
