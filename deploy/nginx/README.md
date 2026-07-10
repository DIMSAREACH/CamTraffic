# Nginx Configuration

> Task **122** — Reverse proxy and static file serving

## Files

| File | Purpose |
|------|---------|
| `nginx.conf` | Global worker, gzip, and logging settings |
| `camtraffic.conf` | Virtual hosts for admin, app, API, and AI service |

## Hostnames (example)

| Host | Backend |
|------|---------|
| `admin.camtraffic.kh` | SPA from `/var/www/admin` + `/api/` proxy |
| `app.camtraffic.kh` | SPA from `/var/www/user` + `/api/` proxy |
| `api.camtraffic.kh` | Proxy to Gunicorn (`backend:8000`) |
| `ai.camtraffic.kh` | Proxy to AI service (`ai-service:8001`) |

## Production image

Built by `deploy/docker/Dockerfile.nginx.prod` — compiles both frontends and copies configs into `nginx:alpine`.

## HTTPS

Uncomment the SSL `server` blocks in `camtraffic.conf` after certificates are issued. See [../ssl/README.md](../ssl/README.md).

## Status

- [x] Completed
