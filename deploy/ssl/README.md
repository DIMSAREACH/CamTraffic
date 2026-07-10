# SSL & HTTPS

> Task **127** — TLS certificates and Nginx hardening

## Files

| File | Purpose |
|------|---------|
| `ssl-params.conf` | TLS protocols, HSTS, security headers (included by Nginx) |
| `certbot-init.sh` | First-time certificate issuance |
| `certbot-renew.sh` | Renewal hook for cron / certbot container |

## Initial setup

1. Point DNS A records to your server:
   - `admin.camtraffic.kh`
   - `app.camtraffic.kh`
   - `api.camtraffic.kh`
   - `ai.camtraffic.kh`

2. Start the production stack on HTTP (port 80).

3. Issue certificates:

```bash
sh deploy/ssl/certbot-init.sh camtraffic.kh admin@camtraffic.kh
```

4. Uncomment HTTPS `server` blocks in `deploy/nginx/camtraffic.conf`.

5. Rebuild and restart nginx:

```bash
npm run docker:prod:up
```

## Auto-renewal

```bash
docker compose -f deploy/docker/docker-compose.prod.yml \
  --env-file .env.production \
  --profile ssl up -d certbot
```

## Status

- [x] Completed
