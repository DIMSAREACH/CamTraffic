import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isDocker = process.env.DOCKER === 'true';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@camtraffic/ui': path.resolve(__dirname, '../packages/ui/src'),
      '@camtraffic/api': path.resolve(__dirname, '../packages/api/src'),
      '@camtraffic/hooks': path.resolve(__dirname, '../packages/hooks/src'),
      '@camtraffic/types': path.resolve(__dirname, '../packages/types/src'),
      '@camtraffic/utils': path.resolve(__dirname, '../packages/utils/src'),
    },
  },
  server: {
    host: isDocker,
    port: 5173,
    strictPort: isDocker,
    watch: isDocker ? { usePolling: true } : undefined,
  },
});
