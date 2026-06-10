import type { ProxyOptions } from 'vite';

/** Proxy /api and /media to Django; return JSON 503 when backend is down (avoids hard proxy crashes). */
export function createApiProxy(target: string): ProxyOptions {
  return {
    target,
    changeOrigin: true,
    configure(proxy) {
      proxy.on('error', (err, _req, res) => {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          `[vite] Backend not reachable at ${target} (${message}). ` +
          'Start Django: cd backend && python manage.py runserver',
        );
        if (res && typeof res.writeHead === 'function' && !res.headersSent) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              message:
                'Backend unavailable. Start Django with: python manage.py runserver (port 8000)',
            }),
          );
        }
      });
    },
  };
}
