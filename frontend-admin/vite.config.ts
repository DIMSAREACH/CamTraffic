import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { createApiProxy } from './shared/vite/apiProxy'
import { assertProductionDataMode } from './shared/vite/assertProductionDataMode'
import { optimizeDeps } from './shared/vite/optimizeDeps'
import { createBuildOptions } from './shared/vite/build'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  assertProductionDataMode(mode, env)
  const userPort = Number(env.VITE_USER_PORT || 5173)
  const adminPort = Number(env.VITE_ADMIN_PORT || 5174)
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000'

  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps,
    resolve: {
      alias: {
        '@': __dirname,
        '@shared': path.resolve(__dirname, 'shared'),
        '@admin': path.resolve(__dirname, 'admin'),
        '@camtraffic/store': path.resolve(__dirname, '../packages/store/src'),
        '@camtraffic/query': path.resolve(__dirname, '../packages/query/src'),
        '@camtraffic/types': path.resolve(__dirname, '../packages/types/src'),
        '@tanstack/react-query': path.resolve(__dirname, '../node_modules/@tanstack/react-query'),
        zustand: path.resolve(__dirname, '../node_modules/zustand'),
      },
      dedupe: ['react', 'react-dom', '@tanstack/react-query', 'zustand'],
    },
    define: {
      'import.meta.env.VITE_PORTAL_SURFACE': JSON.stringify('admin'),
      'import.meta.env.VITE_ADMIN_PORT': JSON.stringify(String(adminPort)),
      'import.meta.env.VITE_USER_PORT': JSON.stringify(String(userPort)),
    },
    build: createBuildOptions(),
    server: {
      port: adminPort,
      strictPort: true,
      host: '127.0.0.1',
      proxy: {
        '/api': createApiProxy(apiProxyTarget),
        '/media': createApiProxy(apiProxyTarget),
      },
    },
    preview: {
      port: Number(env.VITE_ADMIN_PREVIEW_PORT || 4174),
      strictPort: true,
      host: '127.0.0.1',
      proxy: {
        '/api': createApiProxy(apiProxyTarget),
        '/media': createApiProxy(apiProxyTarget),
      },
    },
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
