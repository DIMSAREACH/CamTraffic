import type { ProxyOptions } from 'vite';
import http from 'node:http';
import https from 'node:https';

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 32 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 32 });

/** Proxy /api and /media to Django; return JSON 503 when backend is down (avoids hard proxy crashes). */
export function createApiProxy(target: string): ProxyOptions {
  const isHttps = target.startsWith('https://');
  return {
    target,
    changeOrigin: true,
    timeout: 60_000,
    proxyTimeout: 60_000,
    agent: isHttps ? httpsAgent : httpAgent,
    configure(proxy) {
      proxy.on('error', (err, _req, res) => {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          `[vite] Backend not reachable at ${target} (${message}). ` +
          'Start Django: cd src/backend && python manage.py runserver',
        );
        const socket = res as { writeHead?: Function; headersSent?: boolean; end?: Function } | undefined;
        if (socket && typeof socket.writeHead === 'function' && !socket.headersSent) {
          socket.writeHead(503, { 'Content-Type': 'application/json' });
          socket.end?.(
            JSON.stringify({
              success: false,
              message:
                'Backend unavailable. Start Django with: python manage.py runserver (port 8000)',
            }),
          );
        }
      });
      proxy.on('proxyReq', (proxyReq) => {
        // Avoid hanging sockets after HMR cancels the browser request.
        proxyReq.setTimeout(60_000);
      });
    },
  };
}
