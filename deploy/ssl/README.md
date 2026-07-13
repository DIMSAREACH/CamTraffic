# SSL / DNS — CamTraffic Production

## Domains (default)

| Host | Purpose |
|------|---------|
| `admin.camtraffic.store` | Admin portal |
| `app.camtraffic.store` | User portal (driver + officer) |
| `api.camtraffic.store` | REST API |
| `www.camtraffic.store` | Redirect → admin |

Override in `deploy/env/.env.production` (`DOMAIN_*` variables).

## DNS configuration

Create **A records** pointing to your VPS public IP:

```
admin.camtraffic.store  →  YOUR_VPS_IP
app.camtraffic.store    →  YOUR_VPS_IP
api.camtraffic.store    →  YOUR_VPS_IP
www.camtraffic.store    →  YOUR_VPS_IP
```

Optional: `CAA` record allowing Let's Encrypt issuance.

Verify propagation:

```bash
dig +short admin.camtraffic.store
dig +short app.camtraffic.store
```

## First certificate (Certbot)

1. Start stack without HTTPS certs (nginx serves HTTP fallback):

   ```bash
   npm run docker:prod:up
   ```

2. Issue certificates:

   ```bash
   bash deploy/ssl/certbot-init.sh
   ```

3. Restart nginx to load TLS config:

   ```bash
   npm run docker:prod:restart
   ```

## Renewal

Manual:

```bash
bash deploy/ssl/certbot-renew.sh
```

Automated (optional profile):

```bash
docker compose -f deploy/docker/docker-compose.prod.yml --profile ssl up -d certbot
```

Or add cron:

```cron
0 3 * * * cd /opt/camtraffic && bash deploy/ssl/certbot-renew.sh
```

## TLS settings

See `deploy/ssl/ssl-params.conf` — TLS 1.2/1.3, HSTS, secure headers.

## Related

- `deploy/nginx/camtraffic.conf` — 4 virtual hosts
- `docs/final-year-project/STAGE10-PRODUCTION-DEPLOYMENT-REPORT.md` — full runbook
