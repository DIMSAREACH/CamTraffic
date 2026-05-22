import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const userPort = Number(env.VITE_USER_PORT || 5173)
  const adminPort = Number(env.VITE_ADMIN_PORT || 5174)
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': __dirname,
        '@shared': path.resolve(__dirname, 'shared'),
        '@user': path.resolve(__dirname, 'user'),
      },
    },
    define: {
      'import.meta.env.VITE_PORTAL_SURFACE': JSON.stringify('user'),
      'import.meta.env.VITE_ADMIN_PORT': JSON.stringify(String(adminPort)),
      'import.meta.env.VITE_USER_PORT': JSON.stringify(String(userPort)),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      port: userPort,
      strictPort: true,
      host: true,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/media': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
